import * as cdk from 'aws-cdk-lib';
import { Stack, Duration } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigatewayv2_integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { CfnOutput } from 'aws-cdk-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BackendStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // 创建 Docker 镜像
    const dockerAsset = new ecr_assets.DockerImageAsset(this, 'OllamaImage', {
      directory: join(__dirname, '../docker/ecs-ollama'),
    });

    // 创建 VPC
    const vpc = new ec2.Vpc(this, 'OllamaVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // 创建 ECS 集群
    const cluster = new ecs.Cluster(this, 'OllamaCluster', {
      vpc,
      containerInsights: true,
    });

    // 创建任务执行角色
    const taskExecutionRole = new iam.Role(this, 'OllamaTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role that the ECS service will use to pull images and write logs',
    });

    // 添加 ECR 和 CloudWatch Logs 权限
    taskExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );

    // 创建任务角色
    const taskRole = new iam.Role(this, 'OllamaTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role that the Ollama container will use when running',
    });

    // 添加 CloudWatch Logs 权限
    taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*'],
    }));

    // S3 权限
    taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: ['*'],
    }));

    // 添加 ECR 权限

    // 创建 ECS 任务定义
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'OllamaTask', {
      memoryLimitMiB: 32768,
      cpu: 8192,
      taskRole: taskRole,
      executionRole: taskExecutionRole,
    });

    // 添加 Ollama 容器
    taskDefinition.addContainer('OllamaContainer', {
      image: ecs.ContainerImage.fromDockerImageAsset(dockerAsset),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ollama' }),
      portMappings: [
        {
          containerPort: 11434,
          protocol: ecs.Protocol.TCP,
        },
      ],
      environment: {
        // 添加环境变量（如果需要）
      },
    });

    // 创建 Fargate 服务
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'OllamaService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      publicLoadBalancer: true,
      listenerPort: 11434,
      targetProtocol: ecs.Protocol.HTTP,
      assignPublicIp: true,
      healthCheckGracePeriod: Duration.seconds(600),
    });

    // 配置目标组 - 增加超时时间
    fargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '900');
    fargateService.targetGroup.setAttribute('load_balancing.algorithm.type', 'round_robin');

    // 配置负载均衡器 - 增加空闲超时时间
    const cfnLoadBalancer = fargateService.loadBalancer.node.defaultChild;
    cfnLoadBalancer.loadBalancerAttributes = [
      {
        key: 'idle_timeout.timeout_seconds',
        value: '900'
      }
    ];

    // 配置安全组
    fargateService.service.connections.allowFromAnyIpv4(ec2.Port.tcp(11434), 'Allow Ollama API access');

    // 创建 Lambda 函数
    const predictFunction = new NodejsFunction(this, 'PredictFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, '../lambda/predict.js'),
      handler: 'handler',
      timeout: Duration.seconds(900),
      memorySize: 256,
      environment: {
        OLLAMA_API_URL: `http://${fargateService.loadBalancer.loadBalancerDnsName}:11434`,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
    });

    // 添加 Bedrock 调用权限
    predictFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:*',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/*`,
      ],
    }));

    // 添加 Parameter Store 访问权限
    predictFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters'
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/openai/api-key`
      ],
    }));

    // 创建 Authorizer Lambda
    const authorizerFunction = new NodejsFunction(this, 'AuthorizerFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, '../lambda/authorize.js'),
      handler: 'handler',
    });

    // Create the authorizer 
    const authorizer = new WebSocketLambdaAuthorizer('Authorizer', authorizerFunction, {
      identitySource: ['route.request.querystring.Authorization']
    });

    // 创建 WebSocket API with authorizer on $connect route
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'OllamaWebSocketApi', {
      connectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          'ConnectIntegration',
          new NodejsFunction(this, 'ConnectHandler', {
            runtime: Runtime.NODEJS_18_X,
            entry: join(__dirname, '../lambda/connect.js'),
            handler: 'handler',
          })
        ),
        authorizer  // Add authorizer only to connect route
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration',
          new NodejsFunction(this, 'DisconnectHandler', {
            runtime: Runtime.NODEJS_18_X,
            entry: join(__dirname, '../lambda/disconnect.js'),
            handler: 'handler',
          })
        ),
      },
    });

    // Add predict route without authorizer
    webSocketApi.addRoute('predict', {
      integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
        'PredictIntegration',
        predictFunction
      )
    });

    // 给 authorizer lambda 添加权限
    authorizerFunction.addPermission('InvokeByApiGateway', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/authorizers/*`
    });

    // 创建 WebSocket Stage
    const stage = new apigatewayv2.WebSocketStage(this, 'OllamaWebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // 给 Lambda 添加发送消息的权限
    predictFunction.addEnvironment('WEBSOCKET_ENDPOINT', stage.url);
    predictFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`],
    }));

    // 为前端创建 Docker 镜像
    const frontendImage = new ecr_assets.DockerImageAsset(this, 'FrontendImage', {
      directory: join(__dirname, '../../frontend'),
      file: 'Dockerfile',
    });

    // 创建前端服务
    const frontendService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'FrontendService', {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromDockerImageAsset(frontendImage),
        containerPort: 3000,
        environment: {
          NEXT_PUBLIC_WS_URL: stage.url,  // WebSocket API URL
        },
      },
      publicLoadBalancer: true,
    });

    // 配置健康检查
    frontendService.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200,301,302',
    });

    // 输出前端服务的 URL
    new CfnOutput(this, 'FrontendURL', {
      value: frontendService.loadBalancer.loadBalancerDnsName,
      description: 'Frontend Application URL',
    });

    // 输出 WebSocket URL
    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: stage.url,
      description: 'WebSocket API endpoint URL',
    });

    // 输出 Ollama Service URL
    new cdk.CfnOutput(this, 'OllamaServiceUrl', {
      value: `http://${fargateService.loadBalancer.loadBalancerDnsName}:11434`,
      description: 'Ollama Service URL',
    });
  }
} 