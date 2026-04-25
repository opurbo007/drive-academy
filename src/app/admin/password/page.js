'use client'
import { Suspense, useState } from 'react'
import { Card, CaptainShell, FBtn, FInput, LoadingScreen, Notice, useCaptainPageAccess } from '@/components/captain/CaptainUi'

export default function PasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordPageContent />
    </Suspense>
  )
}

function PasswordPageContent() {
  const { loading, authFetch, side, sideMeta } = useCaptainPageAccess()
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')

  const flash = (setter, text, ms = 3000) => {
    setter(text)
    setTimeout(() => setter(''), ms)
  }

  const handleChangePassword = async event => {
    event.preventDefault()
    setPwErr('')
    setPwMsg('')

    if (pwForm.newPassword !== pwForm.confirm) {
      setPwErr('Passwords do not match')
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwErr('Password must be at least 6 characters')
      return
    }

    const response = await authFetch(`/api/auth/change-password?side=${side}`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    })
    const data = await response.json()
    if (response.ok) {
      flash(setPwMsg, 'Password changed')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } else {
      setPwErr(data.error || 'Failed')
    }
  }

  if (loading || !sideMeta) {
    return <LoadingScreen />
  }

  return (
    <CaptainShell side={side} sideMeta={sideMeta} title="Password" subtitle="Update only this side captain password.">
      <Card title="Change Password" sub="Use a minimum of 6 characters.">
        <form onSubmit={handleChangePassword} className="space-y-3">
          <FInput type="password" placeholder="Current password" value={pwForm.currentPassword} onChange={value => setPwForm(prev => ({ ...prev, currentPassword: value }))} />
          <FInput type="password" placeholder="New password" value={pwForm.newPassword} onChange={value => setPwForm(prev => ({ ...prev, newPassword: value }))} />
          <FInput type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={value => setPwForm(prev => ({ ...prev, confirm: value }))} />
          {pwErr && <Notice type="error" text={pwErr} />}
          {pwMsg && <Notice type="success" text={pwMsg} />}
          <FBtn label="Change Password" color={sideMeta.accent} />
        </form>
      </Card>
    </CaptainShell>
  )
}
