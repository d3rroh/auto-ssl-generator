"use client"

import { useEffect, useState } from "react"

interface DnsLoaderProps {
  text?: string
  size?: number
}

export function DnsLoader({ text = "CHECKING", size = 180 }: DnsLoaderProps) {
  const [letters, setLetters] = useState(text.split(""))

  useEffect(() => {
    setLetters(text.split(""))
  }, [text])

  return (
    <div className="dns-loader-wrapper" style={{ width: size, height: size }}>
      <div className="dns-loader" />
      <div className="dns-loader-text">
        {letters.map((char, i) => (
          <span key={i} className="dns-loader-letter" style={{ animationDelay: `${i * 0.1}s` }}>
            {char}
          </span>
        ))}
      </div>
    </div>
  )
}
