import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import Problem from '@/components/landing/Problem'
import Solution from '@/components/landing/Solution'
import HowItWorks from '@/components/landing/HowItWorks'
import TwoWorlds from '@/components/landing/TwoWorlds'
import Vision from '@/components/landing/Vision'
import FinalCTA from '@/components/landing/FinalCTA'

export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <TwoWorlds />
      <Vision />
      <FinalCTA />
    </>
  )
}
