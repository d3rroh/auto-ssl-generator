"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SslApp } from "@/components/ssl-app"
import { BackgroundScene, type SceneState } from "@/components/three-scene"

export default function HomeClient() {
  const [sceneState, setSceneState] = useState<SceneState>("idle")

  const handleSceneState = useCallback((state: SceneState) => {
    setSceneState(state)
  }, [])

  return (
    <>
      <BackgroundScene sceneState={sceneState} />
      <div className="relative flex min-h-screen flex-col" style={{ position: "relative", zIndex: 1 }}>
        <Header sceneState={sceneState} />
        <main className="flex-1">
          <SslApp onSceneStateChange={handleSceneState} />
        </main>
        <Footer sceneState={sceneState} />
      </div>
    </>
  )
}
