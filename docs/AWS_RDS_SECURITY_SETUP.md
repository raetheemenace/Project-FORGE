# AWS RDS Security Group Setup - Allow Teammate Access

## Overview

To allow your teammates to connect to the PostgreSQL RDS database from their computers, you need to add their IP addresses to the RDS Security Group.

## Step 1: Get Your Teammate's IP Address

Your teammate needs to find their public IP address:

### Method 1: Quick Website Check
1. Go to: https://whatismyipaddress.com/
2. Copy the **IPv4 address** shown (e.g., `203.123.45.67`)
3. Send this IP to you

### Method 2: Google Search
1. Google: "what is my ip"
2. Copy the IP address shown
3. Send this IP to you

**Note:** If your teammate is on a dynamic IP (changes frequently), they may need to update this periodically, or you can allow a broader IP range.

## Step 2: Log into AWS Console

1. Go to: https://console.aws.amazon.com/
2. Sign in with your AWS account credentials
3. Make sure you're in the correct region (top-right corner)
   - Example: **Asia Pacific (Singapore) ap-southeast-1**

## Step 3: Navigate to RDS

1. In the AWS Console search bar (top), type: **RDS**
2. Click on **RDS** (Relational Database Service)
3. You'll see the RDS Dashboard

## Step 4: Find Your Database

1. In the left sidebar, click **"Databases"**
2. Find your database instance (e.g., `forge-db`)
3. Click on the database name to open details

## Step 5: Access Security Group

### Option A: From Database Details Page
1. Scroll down to **"Connectivity & security"** section
2. Under **"Security"**, you'll see **"VPC security groups"**
3. Click on the security group name (e.g., `default` or `rds-launch-wizard-1`)
   - It will open in a new tab showing the Security Group

### Option B: From EC2 Console
1. Go to **EC2** service (search in top bar)
2. In left sidebar, scroll down to **"Network & Security"** → **"Security Groups"**
3. Find the security group associated with your RDS instance
4. Click on the Security Group ID

## Step 6: Add Inbound Rule for Teammate's IP

1. In the Security Group page, click the **"Inbound rules"** tab
2. Click **"Edit inbound rules"** button
3. Click **"Add rule"** button
4. Configure the new rule:
   - **Type:** Select **"PostgreSQL"** (this auto-fills port 5432)
   - **Protocol:** TCP (auto-filled)
   - **Port range:** 5432 (auto-filled)
   - **Source:** Select **"My IP"** dropdown, then choose **"Custom"**
   - **CIDR block:** Enter your teammate's IP address followed by `/32`
     - Example: `203.123.45.67/32`
     - The `/32` means "only this specific IP address"
   - **Description:** Add a note like "John's laptop" or "Maria's home IP"

5. Click **"Save rules"**

## Step 7: Verify Access

1. Ask your teammate to try connecting via DBeaver
2. They should now be able to connect successfully
3. If they still can't connect, double-check:
   - IP address is correct
   - Security group rule was saved
   - Database is publicly accessible (see Step 8)

## Step 8: Ensure Database is Publicly Accessible

If teammates still can't connect, verify the database is publicly accessible:

1. Go back to **RDS** → **Databases** → Your database
2. Click **"Modify"** button (top-right)
3. Scroll down to **"Connectivity"** section
4. Under **"Additional configuration"**, find **"Public access"**
5. Select **"Yes"** (Publicly accessible)
6. Scroll to bottom and click **"Continue"**
7. Choose **"Apply immediately"**
8. Click **"Modify DB instance"**

**Security Note:** Public access is fine for development/academic projects, but for production, use VPN or AWS PrivateLink.

## Adding Multiple Teammates

Repeat Step 6 for each teammate, adding a new rule for each IP address:

```
Rule 1: 203.123.45.67/32  (John's laptop)
Rule 2: 198.51.100.42/32  (Maria's home)
Rule 3: 192.0.2.123/32    (Pedro's office)
```

## Alternative: Allow IP Range

If your team is in the same location (e.g., university network):

1. Find the IP range of your network
2. Add a rule with the range:
   - Example: `203.123.45.0/24` (allows 203.123.45.0 to 203.123.45.255)
3. This allows anyone on that network to connect

**Warning:** Broader ranges are less secure. Only use for trusted networks.

## Alternative: Allow All IPs (NOT RECOMMENDED for Production)

For quick testing or demo purposes only:

1. Add inbound rule with:
   - **Source:** `0.0.0.0/0` (allows any IP address)
   - **Description:** "Temporary - Demo only"

2. **IMPORTANT:** Remove this rule after your demo/testing!

**Security Risk:** This allows anyone on the internet to attempt connection. Only use temporarily and ensure you have a strong database password.

## Removing Access

To revoke a teammate's access:

1. Go to Security Group → **Inbound rules** tab
2. Select the rule for their IP address
3. Click **"Delete"** button
4. Click **"Save rules"**

## Troubleshooting

### "Connection timed out" Error
- IP address not added to security group
- Database not publicly accessible
- Wrong region selected in AWS Console

### "Authentication failed" Error
- Wrong username or password
- IP is allowed, but credentials are incorrect

### "Host not found" Error
- Wrong RDS endpoint URL
- Database instance is stopped or deleted

### Teammate's IP Changed
- Dynamic IPs change when router restarts
- Ask teammate to check their current IP: https://whatismyipaddress.com/
- Update the security group rule with new IP

## Security Best Practices

1. **Use Strong Passwords:** Ensure database password is complex
2. **Limit Access:** Only add IPs that need access
3. **Remove Old Rules:** Delete rules for teammates who no longer need access
4. **Monitor Access:** Check RDS logs periodically
5. **Use SSL:** Enable SSL connections for encrypted communication
6. **Rotate Passwords:** Change database password periodically

## Quick Reference: Security Group Rule Format

```
Type: PostgreSQL
Protocol: TCP
Port: 5432
Source: [IP_ADDRESS]/32
Description: [Teammate name or device]
```

## Visual Guide

```
AWS Console
    ↓
RDS Service
    ↓
Databases → Your Database (forge-db)
    ↓
Connectivity & Security → VPC Security Groups → Click security group
    ↓
Inbound rules tab → Edit inbound rules
    ↓
Add rule → Type: PostgreSQL, Source: [IP]/32
    ↓
Save rules
```

## Need Help?

- AWS RDS Documentation: https://docs.aws.amazon.com/rds/
- AWS Security Groups Guide: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html
- Check AWS Support if you have access issues

## Summary Checklist

- [ ] Get teammate's public IP address
- [ ] Log into AWS Console
- [ ] Navigate to RDS → Databases → Your database
- [ ] Click on VPC security group
- [ ] Edit inbound rules
- [ ] Add rule: Type=PostgreSQL, Source=[IP]/32
- [ ] Save rules
- [ ] Verify database is publicly accessible
- [ ] Test connection from teammate's computer
