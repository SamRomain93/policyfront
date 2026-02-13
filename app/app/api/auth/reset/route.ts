import { getSupabase } from '@/app/lib/supabase'
import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    const sendgridKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@policyfront.io'
    const fromName = process.env.SENDGRID_FROM_NAME || 'PolicyFront'
    const templateId = process.env.SENDGRID_RESET_TEMPLATE_ID || ''

    if (!sendgridKey) {
      return NextResponse.json({ error: 'SendGrid not configured' }, { status: 503 })
    }

    sgMail.setApiKey(sendgridKey)

    // Generate recovery link via Supabase admin
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'https://policyfront.io/update-password' },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Reset link error:', linkError?.message || 'missing link')
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
    }

    const resetLink = linkData.properties.action_link

    const msg = templateId
      ? {
          to: email,
          from: { email: fromEmail, name: fromName },
          templateId,
          dynamicTemplateData: { reset_link: resetLink },
        }
      : {
          to: email,
          from: { email: fromEmail, name: fromName },
          subject: 'Reset your PolicyFront password',
          html: `
            <div style="font-family:Arial,sans-serif;font-size:16px;color:#111">
              <p>Click the link below to reset your password:</p>
              <p><a href="${resetLink}">Reset Password</a></p>
              <p>If you didn’t request this, you can ignore this email.</p>
            </div>
          `,
        }

    await sgMail.send(msg as any)

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
