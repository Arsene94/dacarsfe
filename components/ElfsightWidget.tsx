'use client'

import { useEffect } from 'react'

export default function ElfsightWidget() {
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://static.elfsight.com/platform/platform.js'
        script.defer = true
        script.setAttribute('data-use-service-core', '')
        document.body.appendChild(script)
    }, [])

    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in">
                    <div className="elfsight-app-59eeded2-1ad4-43a9-aba0-3cb2f0adac4c" />
                </div>
            </div>
        </section>
    )
}
