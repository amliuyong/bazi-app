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
      memoryLimitMiB: 16384, // 16GB 内存
      cpu: 4096, // 4 vCPU
      taskRole: taskRole,
      executionRole: taskExecutionRole,
    });

    // 添加 Ollama 容器
    const container = taskDefinition.addContainer('OllamaContainer', {
      image: ecs.ContainerImage.fromDockerImageAsset(dockerAsset),
      memoryLimitMiB: 16384,
      cpu: 4096,
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
      listenerPort: 80,
      targetProtocol: ecs.Protocol.HTTP,
      cpu: 4096,
      memoryLimitMiB: 16384,
      assignPublicIp: true,
      healthCheckGracePeriod: Duration.seconds(600), // 给予足够的时间下载模型
    });

    // 配置健康检查
    fargateService.targetGroup.configureHealthCheck({
      path: '/api/health',
      port: '80',
      interval: Duration.seconds(60),
      timeout: Duration.seconds(30),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
      startPeriod: Duration.seconds(600), // 给予足够的启动时间
    });

    // 配置安全组
    fargateService.service.connections.allowFromAnyIpv4(ec2.Port.tcp(11434), 'Allow Ollama API access');

    // 创建 Lambda 函数
    const predictFunction = new NodejsFunction(this, 'PredictFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, '../lambda/predict.js'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        OLLAMA_API_URL: `http://${fargateService.loadBalancer.loadBalancerDnsName}:11434`,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: [
          'aws-sdk',
        ],
      },
    });

    // 创建 API Gateway
    const api = new apigateway.RestApi(this, 'PredictApi', {
      restApiName: 'Predict Service',
      description: 'This is the API for prediction service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowCredentials: true,
      },
    });

    // 创建 API 资源和方法
    const predict = api.root.addResource('predict');
    predict.addMethod('POST', new apigateway.LambdaIntegration(predictFunction));

    // 输出 API Gateway URL 和 Ollama Service URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'OllamaServiceUrl', {
      value: `http://${fargateService.loadBalancer.loadBalancerDnsName}:11434`,
      description: 'Ollama Service URL',
    });
  }
} 