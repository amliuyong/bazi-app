
export AWS_REGION=us-east-1

export JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=true

echo -n "Enter stack name: (bazi) "
read stackName

if [ -z "$stackName" ]; then
  stackName="bazi"
fi

echo "Deploying backend stack..."
npx cdk deploy --require-approval never --context stackName=$stackName