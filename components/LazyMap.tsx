'use client'

import { useEffect, useRef, useState } from 'react'

export default function LazyMap() {
    const ref = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const current = ref.current
        if (!current) return

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setIsVisible(true)
                observer.disconnect()
            }
        })

        observer.observe(current)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className="bg-gray-200 rounded-xl h-96 flex items-center justify-center relative overflow-hidden"
        >
            {isVisible ? (
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d815.3588428573492!2d26.0663427!3d44.5758331!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x678a7a998cb5b303%3A0x3591ace01367d55c!2sDaCars!5e0!3m2!1sen!2sro!4v1693793200000!5m2!1sen!2sro"
                    width="100%"
                    height="100%"
                    className="rounded-xl"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Harta DaCars Otopeni"
                />
            ) : (
                <span className="text-gray-500">Loading map…</span>
            )}
        </div>
    )
}
