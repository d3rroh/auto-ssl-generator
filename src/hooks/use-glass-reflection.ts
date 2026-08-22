"use client"

import { useEffect } from "react"

const LERP = 0.12
const ATTRACT = 0.04

export function useGlassReflection() {
  useEffect(() => {
    const isTouch =
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    if (isTouch) return

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    type Entry = {
      el: HTMLElement
      tx: number
      ty: number
      cx: number
      cy: number
      active: boolean
      raf: number
    }

    const entries = new Map<HTMLElement, Entry>()

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    function tick(entry: Entry) {
      if (reducedMotion) {
        entry.cx = 50
        entry.cy = 50
      } else {
        const speed = entry.active ? LERP : ATTRACT
        entry.cx = lerp(entry.cx, entry.tx, speed)
        entry.cy = lerp(entry.cy, entry.ty, speed)
      }

      entry.el.style.setProperty("--mouse-x", `${entry.cx}%`)
      entry.el.style.setProperty("--mouse-y", `${entry.cy}%`)

      const settled =
        Math.abs(entry.cx - entry.tx) < 0.05 &&
        Math.abs(entry.cy - entry.ty) < 0.05

      if (entry.active || !settled) {
        entry.raf = requestAnimationFrame(() => tick(entry))
      }
    }

    function ensureRunning(entry: Entry) {
      if (entry.raf) return
      entry.raf = requestAnimationFrame(() => tick(entry))
    }

    function attach(el: HTMLElement) {
      if (entries.has(el)) return

      const entry: Entry = {
        el,
        tx: 50,
        ty: 50,
        cx: 50,
        cy: 50,
        active: false,
        raf: 0,
      }
      entries.set(el, entry)

      el.addEventListener("mouseenter", () => {
        entry.active = true
        ensureRunning(entry)
      })

      el.addEventListener("mouseleave", () => {
        entry.active = false
        entry.tx = 50
        entry.ty = 50
        ensureRunning(entry)
      })

      el.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        entry.tx = ((e.clientX - rect.left) / rect.width) * 100
        entry.ty = ((e.clientY - rect.top) / rect.height) * 100
      })
    }

    function scan() {
      document.querySelectorAll<HTMLElement>(".glass-reflection").forEach(attach)
    }

    scan()

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          if (node.classList.contains("glass-reflection")) attach(node)
          node.querySelectorAll<HTMLElement>(".glass-reflection").forEach(attach)
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      entries.forEach((entry) => {
        cancelAnimationFrame(entry.raf)
      })
      entries.clear()
    }
  }, [])
}
