"use client";
import React, { useState } from 'react'
import Image from 'next/image'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

const Page = () => {
  const register = useMutation(api.unga.register)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [org, setOrg] = useState("")
  const [loading, setLoading] = useState(false)
  const [assignedNumber, setAssignedNumber] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim() || !phone.trim() || !org.trim()) {
      setError("Please fill in name, email, phone number, and organization.")
      return
    }
    try {
      setLoading(true)
      const res = await register({ name, email, phone, org })
      setAssignedNumber(res.assignedNumber)
      setName("")
      setEmail("")
      setPhone("")
      setOrg("")
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className='w-full max-w-lg md:max-w-xl bg-white/95 backdrop-blur border border-gray-100 rounded-2xl shadow-xl ring-1 ring-black/5 p-6 md:p-8'>
      <div className='w-full flex items-center justify-center mb-6'>
        <Image src="/images/logo/logo_pebec1.PNG" alt="PEBEC Logo" width={140} height={56} className="object-contain" />
      </div>
      <h1 className='text-3xl font-bold tracking-tight text-center mb-2'>UNGA Registration</h1>
      <p className='text-sm text-center text-gray-600 mb-8'>Please provide your details below.</p>
      <form onSubmit={handleSubmit} className='grid gap-5'>
        <div>
          <label className='block text-sm font-medium mb-1'>Name</label>
          <input className='w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent' value={name} onChange={e=>setName(e.target.value)} placeholder='Your full name' />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>Email</label>
          <input type='email' className='w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent' value={email} onChange={e=>setEmail(e.target.value)} placeholder='you@example.com' />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>Phone Number</label>
          <input type='tel' className='w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent' value={phone} onChange={e=>setPhone(e.target.value)} placeholder='e.g. +2348012345678' />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>Organization</label>
          <input className='w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent' value={org} onChange={e=>setOrg(e.target.value)} placeholder='Organization' />
        </div>
        {error && <p className='text-red-600 text-sm'>{error}</p>}
        <button type='submit' disabled={loading} className='h-11 w-full bg-black text-white rounded-lg font-medium shadow-sm hover:bg-zinc-800 disabled:opacity-60'>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
    {assignedNumber !== null && (
      <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4' role='dialog' aria-modal='true'>
        <div className='w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 p-6 md:p-8 text-center'>
          <div className='mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-green-100'>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className='h-12 w-12 stroke-green-600'>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor"/>
              <path d="M22 4 12 14.01l-3-3" stroke="currentColor"/>
            </svg>
          </div>
          <h2 className='text-2xl font-semibold text-green-700 mb-2'>Registration successful!</h2>
          <p className='text-gray-600 mb-6'>Your assigned number is <span className='font-semibold'>#{assignedNumber}</span>.</p>
          <button onClick={() => setAssignedNumber(null)} className='h-11 w-full rounded-full bg-green-600 text-white font-medium shadow hover:bg-green-700'>
            Ok
          </button>
        </div>
      </div>
    )}
    </>
  )
}

export default Page