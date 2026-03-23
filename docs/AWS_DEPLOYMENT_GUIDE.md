# FORGE AWS Deployment Guide

Complete guide for deploying the FORGE system to AWS cloud infrastructure.

## Overview

This guide walks through deploying FORGE's full-stack architecture:
- **Frontend**: React PWA on AWS Amplify
- **Backend**: Express.js API on AWS Elastic Beanstalk
- **Database**: PostgreSQL on Amazon RDS
- **AI Services**: AWS Bedrock (Claude Sonnet 4), Polly, Transcribe
- **Storage**: Amazon S3

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- EB CLI installed: `pip install awsebcli`
- Node.js v24.14.0 installed
- Git repository with FORGE codebase
- Domain name (optional, for custom URLs)

## Deployment Order

Follow this sequence to ensure dependencies are met:

1. ✅ **RDS PostgreSQL** - Database must exist before backend
2. ✅ **S3 Bucket** - Storage for equipment images
3. ✅ **IAM Policies** - Permissions for all services
4. ✅ **Elastic Beanstalk** - Backend API deployment
5. ✅ **Amplify** - Frontend PWA deployment
6. ✅ **Bedrock, Polly, Transcribe** - AI service enablement

## Quick Start

### 1. Set Up Database (15 minutes)

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier forge-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 17.6 \
  --master-username forge_admin \
  --master-user-password 'YourSecurePassword123!' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --publicly-accessible \
  --backup-retention-period 7 \
  --db-name forge

# Wait for instance to be available (5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier forge-db

# Get endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier forge-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Database endpoint: $DB_ENDPOINT"

# Run schema creation
psql -h $DB_ENDPOINT -U forge_admin -d forge -f backend/db/schema.sql
```

**Detailed guide**: [AWS_RDS_POSTGRESQL_SETUP.md](./AWS_RDS_POSTGRESQL_SETUP.md)

### 2. Create S3 Bucket (5 minutes)

```bash
# Create bucket
aws s3api create-bucket \
  --bucket forge-equipment-images \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket forge-equipment-images \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket forge-equipment-images \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Detailed guide**: [AWS_S3_SETUP.md](./AWS_S3_SETUP.md)

### 3. Create IAM Policies (10 minutes)

Create a combined policy for all FORGE services:

```bash
cat > forge-services-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*:*:model/anthropic.claude-sonnet-4-*"
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::forge-equipment-images",
        "arn:aws:s3:::forge-equipment-images/*"
      ]
    },
    {
      "Sid": "PollyAccess",
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TranscribeAccess",
      "Effect": "Allow",
      "Action": [
        "transcribe:StartStreamTranscription"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name FORGE-Services-Policy \
  --policy-document file://forge-services-policy.json
```

### 4. Deploy Backend (20 minutes)

```bash
cd backend

# Initialize Elastic Beanstalk
eb init -p "Node.js 24" -r us-east-1 forge-backend

# Create environment
eb create forge-production \
  --instance-type t3.micro \
  --envvars \
    DB_USER=forge_admin,\
    DB_PASSWORD=YourSecurePassword123!,\
    DB_HOST=$DB_ENDPOINT,\
    DB_PORT=5432,\
    DB_NAME=forge,\
    JWT_SECRET=$(openssl rand -base64 32),\
    AWS_REGION=us-east-1,\
    S3_BUCKET_NAME=forge-equipment-images,\
    BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0,\
    POLLY_VOICE_ID=Joanna,\
    TRANSCRIBE_LANGUAGE_CODE=en-US

# Attach IAM policy to EB role
EB_ROLE=$(aws elasticbeanstalk describe-configuration-settings \
  --application-name forge-backend \
  --environment-name forge-production \
  --query 'ConfigurationSettings[0].OptionSettings[?OptionName==`IamInstanceProfile`].Value' \
  --output text)

aws iam attach-role-policy \
  --role-name $EB_ROLE \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/FORGE-Services-Policy

# Deploy
eb deploy

# Get backend URL
BACKEND_URL=$(eb status --verbose | grep CNAME | awk '{print $2}')
echo "Backend URL: https://$BACKEND_URL"
```

**Detailed guide**: [AWS_ELASTIC_BEANSTALK_SETUP.md](./AWS_ELASTIC_BEANSTALK_SETUP.md)

### 5. Deploy Frontend (15 minutes)

#### Option A: Via Amplify Console (Recommended)

1. Go to https://console.aws.amazon.com/amplify/
2. Click "New app" > "Host web app"
3. Connect your GitHub repository
4. Select branch: `main`
5. Build settings:
   - App root: `frontend`
   - Build command: `npm ci --legacy-peer-deps && npm run build`
   - Output directory: `dist`
6. Environment variables:
   - `VITE_API_URL`: `https://$BACKEND_URL`
7. Deploy

#### Option B: Via Amplify CLI

```bash
cd frontend

# Update API URL in code or .env
echo "VITE_API_URL=https://$BACKEND_URL" > .env.production

# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

**Detailed guide**: [AWS_AMPLIFY_SETUP.md](./AWS_AMPLIFY_SETUP.md)

### 6. Enable AI Services (5 minutes)

#### Test Bedrock Access

Models are now automatically enabled on first use! Simply test the integration:

```bash
cd backend
node test-bedrock.js
```

**If this is your first time using Anthropic models:**
1. You may be prompted to submit a use case
2. Go to Bedrock Console > Model catalog > Claude Sonnet 4
3. Submit use case: "Laboratory equipment identification for education"
4. Approval is typically instant
5. Run the test again

**Detailed guide**: [AWS_BEDROCK_SETUP.md](./AWS_BEDROCK_SETUP.md)

#### Polly and Transcribe

No additional setup required - already enabled via IAM policy.

**Detailed guide**: [AWS_POLLY_TRANSCRIBE_SETUP.md](./AWS_POLLY_TRANSCRIBE_SETUP.md)

### 7. Configure Security Groups (5 minutes)

Allow backend to access database:

```bash
# Get EB security group
EB_SG=$(aws ec2 describe-instances \
  --filters "Name=tag:elasticbeanstalk:environment-name,Values=forge-production" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Get RDS security group
RDS_SG=$(aws rds describe-db-instances \
  --db-instance-identifier forge-db \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

# Allow EB to access RDS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG
```

### 8. Update CORS Configuration (5 minutes)

Get your Amplify URL and update backend CORS:

```bash
# Get Amplify URL
AMPLIFY_URL=$(aws amplify list-apps \
  --query 'apps[?name==`forge-frontend`].defaultDomain' \
  --output text)

echo "Amplify URL: https://$AMPLIFY_URL"
```

Update `backend/index.js`:

```javascript
app.use(cors({
  origin: [
    'https://$AMPLIFY_URL',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

Redeploy backend:

```bash
cd backend
eb deploy
```

## Verification Checklist

After deployment, verify each component:

### ✅ Database

```bash
psql -h $DB_ENDPOINT -U forge_admin -d forge -c "\dt"
# Should list all FORGE tables
```

### ✅ Backend API

```bash
curl https://$BACKEND_URL/api/health
# Should return: {"status":"healthy"}
```

### ✅ Frontend

Open `https://$AMPLIFY_URL` in browser:
- Landing page loads
- Sign in/sign up works
- Dashboard displays

### ✅ S3 Storage

```bash
aws s3 ls s3://forge-equipment-images/
# Should list bucket contents
```

### ✅ Bedrock

```bash
cd backend
node test-bedrock.js
# Should return equipment identification
```

### ✅ Polly

```bash
cd backend
node test-polly.js
# Should generate test-polly-output.mp3
```

### ✅ Transcribe

```bash
cd backend
node test-transcribe.js
# Should initialize successfully
```

## Post-Deployment Configuration

### 1. Set Up Custom Domain (Optional)

#### For Amplify (Frontend)

1. Go to Amplify Console > Domain management
2. Add custom domain
3. Follow DNS configuration instructions

#### For Elastic Beanstalk (Backend)

1. Go to Route 53 > Hosted zones
2. Create A record pointing to EB environment
3. Or use CloudFront for HTTPS

### 2. Enable HTTPS

Both Amplify and Elastic Beanstalk provide HTTPS by default.

For custom domains:
- Amplify: Automatic SSL via AWS Certificate Manager
- Elastic Beanstalk: Configure SSL certificate in load balancer

### 3. Set Up Monitoring

#### CloudWatch Alarms

```bash
# High CPU alarm for backend
aws cloudwatch put-metric-alarm \
  --alarm-name forge-backend-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ElasticBeanstalk \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=EnvironmentName,Value=forge-production

# High database connections
aws cloudwatch put-metric-alarm \
  --alarm-name forge-db-high-connections \
  --alarm-description "Alert when DB connections exceed 80" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=DBInstanceIdentifier,Value=forge-db
```

#### Billing Alarms

```bash
# Alert when monthly cost exceeds $50
aws cloudwatch put-metric-alarm \
  --alarm-name forge-billing-alert \
  --alarm-description "Alert when monthly cost exceeds $50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=Currency,Value=USD
```

### 4. Set Up Backups

#### RDS Automated Backups

Already enabled (7-day retention). To create manual snapshot:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier forge-db \
  --db-snapshot-identifier forge-db-snapshot-$(date +%Y%m%d)
```

#### S3 Versioning

Already enabled. To restore deleted object:

```bash
aws s3api list-object-versions \
  --bucket forge-equipment-images \
  --prefix equipment/chemistry/EQ-7167.jpg

# Restore specific version
aws s3api copy-object \
  --copy-source forge-equipment-images/equipment/chemistry/EQ-7167.jpg?versionId=VERSION_ID \
  --bucket forge-equipment-images \
  --key equipment/chemistry/EQ-7167.jpg
```

## Cost Estimation

### Monthly Costs (After Free Tier)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| RDS PostgreSQL | db.t3.micro, 20 GB | $12.50 |
| Elastic Beanstalk | t3.micro instance | $7.50 |
| Application Load Balancer | Standard | $16.00 |
| Amplify | 1,000 build min, 15 GB served | Free Tier |
| S3 | 1 GB storage, 10K requests | $0.03 |
| Bedrock (Claude Sonnet 4) | 1K scans/month | $6.00 |
| Polly | 1K TTS requests/month | $3.20 |
| Transcribe | 500 STT requests/month | $2.00 |
| Data Transfer | 10 GB/month | $0.90 |
| **Total** | | **~$48/month** |

### Free Tier Benefits (First 12 Months)

- RDS: 750 hours of db.t3.micro
- EC2: 750 hours of t3.micro
- S3: 5 GB storage, 20K GET, 2K PUT
- Data Transfer: 100 GB out

**Estimated cost with Free Tier: ~$20/month**

## Troubleshooting

### Backend Can't Connect to Database

1. Check security group allows EB to access RDS
2. Verify DB_HOST environment variable is correct
3. Test connection: `eb ssh` then `psql -h $DB_HOST -U forge_admin -d forge`

### Frontend Can't Reach Backend

1. Verify CORS configuration includes Amplify URL
2. Check VITE_API_URL environment variable
3. Ensure backend health endpoint responds: `curl https://$BACKEND_URL/api/health`

### AI Services Not Working

1. Verify IAM policy is attached to EB role
2. Check Bedrock model access is granted
3. Ensure AWS_REGION is set correctly
4. Test with provided test scripts

### High Costs

1. Check CloudWatch billing dashboard
2. Review S3 storage and requests
3. Monitor Bedrock/Polly/Transcribe usage
4. Consider implementing caching

## Maintenance

### Update Backend

```bash
cd backend
# Make code changes
git commit -am "Update backend"
eb deploy
```

### Update Frontend

```bash
cd frontend
# Make code changes
git commit -am "Update frontend"
git push origin main
# Amplify auto-deploys on push
```

### Update Database Schema

```bash
# Create migration script
psql -h $DB_ENDPOINT -U forge_admin -d forge -f backend/db/migrations/001_add_column.sql
```

### Scale Resources

#### Scale Backend

```bash
# Increase instance size
eb scale 2  # Run 2 instances

# Or change instance type
eb config
# Edit instance type in configuration
```

#### Scale Database

```bash
# Increase storage
aws rds modify-db-instance \
  --db-instance-identifier forge-db \
  --allocated-storage 50 \
  --apply-immediately

# Upgrade instance class
aws rds modify-db-instance \
  --db-instance-identifier forge-db \
  --db-instance-class db.t3.small \
  --apply-immediately
```

## Disaster Recovery

### Backup Strategy

1. **RDS**: Automated daily backups (7-day retention)
2. **S3**: Versioning enabled
3. **Code**: Git repository
4. **Configuration**: Document all environment variables

### Recovery Procedure

1. Restore RDS from snapshot
2. Redeploy backend with `eb deploy`
3. Redeploy frontend with `amplify publish`
4. Restore S3 objects from versions if needed

## Security Best Practices

1. ✅ Use IAM roles instead of access keys
2. ✅ Enable encryption at rest (RDS, S3)
3. ✅ Enable encryption in transit (HTTPS)
4. ✅ Restrict database public access
5. ✅ Use security groups for network isolation
6. ✅ Enable CloudWatch logging
7. ✅ Implement rate limiting
8. ✅ Regular security updates
9. ✅ Monitor AWS Security Hub
10. ✅ Enable MFA for AWS account

## Support and Resources

### AWS Documentation

- [Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Amplify](https://docs.aws.amazon.com/amplify/)
- [RDS](https://docs.aws.amazon.com/rds/)
- [Bedrock](https://docs.aws.amazon.com/bedrock/)

### FORGE Documentation

- [AWS Amplify Setup](./AWS_AMPLIFY_SETUP.md)
- [AWS Elastic Beanstalk Setup](./AWS_ELASTIC_BEANSTALK_SETUP.md)
- [AWS RDS PostgreSQL Setup](./AWS_RDS_POSTGRESQL_SETUP.md)
- [AWS Bedrock Setup](./AWS_BEDROCK_SETUP.md)
- [AWS S3 Setup](./AWS_S3_SETUP.md)
- [AWS Polly and Transcribe Setup](./AWS_POLLY_TRANSCRIBE_SETUP.md)

### Getting Help

- AWS Support: https://console.aws.amazon.com/support/
- AWS Forums: https://forums.aws.amazon.com/
- Stack Overflow: Tag questions with `aws`, `elastic-beanstalk`, `amplify`

## Next Steps

After successful deployment:

1. ✅ Test all features end-to-end
2. ✅ Set up monitoring and alarms
3. ✅ Configure custom domain (optional)
4. ✅ Enable auto-scaling for production
5. ✅ Implement CI/CD pipeline
6. ✅ Conduct security audit
7. ✅ Load testing
8. ✅ User acceptance testing
9. ✅ Documentation for end users
10. ✅ Training for lab administrators

## Conclusion

You now have a fully deployed FORGE system on AWS! The platform is:
- ✅ Scalable and reliable
- ✅ Secure and compliant
- ✅ Cost-effective
- ✅ Production-ready

Monitor your deployment regularly and adjust resources based on actual usage patterns.
