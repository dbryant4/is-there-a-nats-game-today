# Email Notification Setup for GitHub Actions

To enable email notifications when the Audi Field time validation fails, you need to configure GitHub Secrets for your repository.

## Required Secrets

Go to your repository settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

### 1. `MAIL_SERVER`
Your SMTP server address
- **Gmail**: `smtp.gmail.com`
- **Outlook/Office 365**: `smtp.office365.com`
- **SendGrid**: `smtp.sendgrid.net`
- **Other**: Check your email provider's documentation

### 2. `MAIL_PORT`
SMTP port number
- **TLS (recommended)**: `587`
- **SSL**: `465`
- **Unencrypted**: `25` (not recommended)

### 3. `MAIL_USERNAME`
Your email address or SMTP username
- Example: `your-email@gmail.com`

### 4. `MAIL_PASSWORD`
Your email password or app-specific password
- **Gmail**: Use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password)
- **Outlook**: Use your regular password or app password
- **SendGrid**: Use your API key

### 5. `MAIL_TO`
Recipient email address (where to send alerts)
- Example: `admin@example.com`
- Multiple recipients: `admin@example.com,team@example.com`

### 6. `MAIL_FROM`
Sender email address
- Example: `noreply@example.com`
- This is usually the same as `MAIL_USERNAME`

## Example: Gmail Setup

1. Enable 2-Step Verification on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Add these secrets:
   - `MAIL_SERVER`: `smtp.gmail.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@gmail.com`
   - `MAIL_PASSWORD`: `your-16-char-app-password`
   - `MAIL_TO`: `recipient@example.com`
   - `MAIL_FROM`: `your-email@gmail.com`

## Testing

You can manually trigger the workflow to test:

1. Go to Actions tab in your repository
2. Select "Update data (daily 12:05am ET)" workflow
3. Click "Run workflow"
4. Check if emails are received when validation fails

## Alternative: GitHub Issues Instead of Email

If you prefer to create GitHub issues instead of sending emails, you can modify `.github/workflows/update-data.yml` to use the `actions/github-script` action instead of the email action.

## Schedule

The validation runs as part of the nightly data update workflow at 12:05 AM Eastern Time (with two cron schedules to handle DST transitions). You can adjust the schedule in the workflow file by changing the cron expressions.

## How It Works

The validation happens automatically during the nightly data update:

1. **Fetch** - The workflow fetches the latest data from Nationals and Audi Field feeds
2. **Validate** - It compares the Audi Field times in the JSON with the website
3. **Alert** - If times don't match, an email is sent immediately
4. **Commit** - The data is committed and pushed (even if validation fails, so the site stays updated)

This ensures you're notified of any discrepancies while still keeping the website updated with the latest available data.

