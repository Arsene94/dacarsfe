"use client";

import React, { useState } from 'react';
import { Gift, RotateCcw, Sparkles } from 'lucide-react';

interface Prize {
    id: number;
    title: string;
    description: string;
    color: string;
    probability: number; // weight
    type: 'discount' | 'upgrade' | 'free_days' | 'try_again' | 'bonus';
}

interface WheelOfFortuneProps {
    isPopup?: boolean;
    onClose?: () => void;
}

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ isPopup = false, onClose }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [spinsLeft, setSpinsLeft] = useState(1);

    // Prizes (weights can sum to anything; treated as relative probabilities)
    const prizes: Prize[] = [
        { id: 1, title: '5% Reducere', description: 'Reducere 5% la următoarea rezervare', color: '#38B275', probability: 20, type: 'discount' },
        { id: 2, title: 'Mai încearcă', description: 'Încearcă din nou! Ai o șansă în plus', color: '#FF6B6B', probability: 45, type: 'try_again' },
        { id: 3, title: '10% Reducere', description: 'Reducere 10% la orice rezervare', color: '#1A3661', probability: 15, type: 'discount' },
        { id: 4, title: '1 Zi Gratis', description: 'O zi suplimentară gratuită', color: '#38B275', probability: 10, type: 'free_days' },
        { id: 5, title: 'Upgrade Gratuit', description: 'Upgrade gratuit la categoria superioară', color: '#1A3661', probability: 8, type: 'upgrade' },
        { id: 6, title: 'Mai încearcă', description: 'Nu te descuraja! Încearcă din nou', color: '#FF6B6B', probability: 45, type: 'try_again' },
        { id: 7, title: '15% Reducere', description: 'Reducere 15% pentru rezervări weekend', color: '#38B275', probability: 5, type: 'discount' },
        { id: 8, title: '2 Zile Gratis', description: 'Două zile suplimentare gratuite', color: '#1A3661', probability: 2, type: 'free_days' }
    ];

    const segmentAngle = 360 / prizes.length;

    // ---------- Helpers pentru probabilități afisate ----------
    const totalWeight = prizes.reduce((s, p) => s + p.probability, 0);

    // ---------- Random ponderat + animare către segmentul câștigător ----------
    const pickWeightedIndex = () => {
        const r = Math.random() * totalWeight;
        let cum = 0;
        for (let i = 0; i < prizes.length; i++) {
            cum += prizes[i].probability;
            if (r < cum) return i;
        }
        return prizes.length - 1; // fallback
    };

    const spinWheel = () => {
        if (isSpinning || spinsLeft <= 0) return;

        // 1) Alegem câștigătorul pe baza probabilităților (nu a unghiului)
        const winningIndex = pickWeightedIndex();
        const winningPrize = prizes[winningIndex];

        // 2) Calculăm un unghi țintă din interiorul segmentului câștigător (evităm marginile)
        const segStart = winningIndex * segmentAngle;
        const padding = Math.min(6, segmentAngle / 6); // deg
        const desiredAngleWithinSegment = segStart + padding + Math.random() * (segmentAngle - 2 * padding);

        // 3) Calculăm rotația finală astfel încât indicatorul (sus) să pice în segmentul țintă
        // normalizedAngle = (360 - (finalRotation % 360)) % 360 === desiredAngleWithinSegment
        const baseRotation = ((rotation % 360) + 360) % 360;
        const rotationToDesiredModulo = (360 - desiredAngleWithinSegment + 360) % 360;
        const deltaToDesired = (rotationToDesiredModulo - baseRotation + 360) % 360;

        const fullSpins = 5 + Math.floor(Math.random() * 5); // 5–9 rotații complete
        const finalRotation = rotation + fullSpins * 360 + deltaToDesired;

        // 4) Animăm roata, apoi afișăm modalul
        setIsSpinning(true);
        setSelectedPrize(null); // curățăm anteriorul până la rezultat
        setShowModal(false);
        setRotation(finalRotation);

        setTimeout(() => {
            setIsSpinning(false);
            setSelectedPrize(winningPrize);
            setShowModal(true);

            if (winningPrize.type !== 'try_again') {
                setSpinsLeft(0);
            }
            // dacă este "try_again", nu scădem încercările (rămâne 1)
        }, 4000);
    };

    const resetSpins = () => {
        setSpinsLeft(1);
        setRotation(0);
        setSelectedPrize(null);
        setShowModal(false);
    };

    const handleClosePopup = () => {
        if (onClose) onClose();
    };

    const winnerModal = (showModal && selectedPrize) ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#38B275]/10 to-[#1A3661]/10" />

                <div className="relative z-10">
                    <div className={`${selectedPrize.type === 'try_again' ? 'bg-yellow-500' : 'bg-[#38B275]'} rounded-full p-6 inline-flex items-center justify-center mb-6`}>
                        {selectedPrize.type === 'try_again' ? (
                            <RotateCcw className="h-12 w-12 text-white" />
                        ) : (
                            <Gift className="h-12 w-12 text-white" />
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-[#1A3661] font-['Poppins'] mb-4">
                        {selectedPrize.type === 'try_again' ? 'Mai încearcă!' : 'Felicitări! 🎉'}
                    </h3>

                    <div className={`${selectedPrize.type === 'try_again' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-[#38B275] to-[#32a066]'} text-white rounded-2xl p-6 mb-6`}>
                        <h4 className="text-xl font-bold font-['Poppins'] mb-2">
                            {selectedPrize.title}
                        </h4>
                        <p className="font-['DM Sans']">
                            {selectedPrize.description}
                        </p>
                    </div>

                    <p className="text-[#191919]/70 font-['DM Sans'] mb-6">
                        {selectedPrize.type === 'try_again'
                            ? 'Nu te descuraja! Ai primit o șansă în plus să câștigi un premiu și mai bun.'
                            : 'Premiul tău a fost salvat și îl poți folosi la următoarea rezervare. Vei primi un email cu codul de reducere în câteva minute.'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {selectedPrize.type === 'try_again' ? (
                            <>
                                <button
                                    onClick={() => { setShowModal(false); setSelectedPrize(null); /* rămâne cu 1 încercare */ }}
                                    className="flex-1 bg-[#38B275] text-white py-3 rounded-lg font-semibold font-['DM Sans'] hover:bg-[#32a066] transition-colors duration-200"
                                >
                                    Încearcă din nou
                                </button>
                                <button
                                    onClick={() => { setShowModal(false); setSelectedPrize(null); }}
                                    className="flex-1 border-2 border-gray-300 text-[#191919] py-3 rounded-lg font-semibold font-['DM Sans'] hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Închide
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => { setShowModal(false); /* navigate('/rezervare') */ }}
                                    className="flex-1 bg-[#38B275] text-white py-3 rounded-lg font-semibold font-['DM Sans'] hover:bg-[#32a066] transition-colors duration-200"
                                >
                                    Rezervă acum
                                </button>
                                <button
                                    onClick={() => { setShowModal(false); setSelectedPrize(null); }}
                                    className="flex-1 border-2 border-gray-300 text-[#191919] py-3 rounded-lg font-semibold font-['DM Sans'] hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Închide
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    const wheelContent = (
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
            {/* Wheel Container */}
            <div className="relative">
                {/* Pointer (sus) */}
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
                    <div
                        className="w-0 h-0
              border-l-[16px] border-r-[16px] border-t-[28px]
              border-l-transparent border-r-transparent border-t-black
              drop-shadow-md"
                    />
                </div>

                <div className="relative w-[380px] sm:w-[520px] md:w-[660px] lg:w-[700px] aspect-square mx-auto">
                    {/* Wheel */}
                    <div
                        className="relative w-full h-full rounded-full border-8 border-white shadow-2xl overflow-hidden"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)' : 'transform 0.3s ease-out'
                        }}
                    >
                        {prizes.map((prize, index) => {
                            const startAngle = index * segmentAngle;
                            const endAngle = (index + 1) * segmentAngle;
                            const midAngle = startAngle + segmentAngle / 2;

                            // Path pentru segment
                            const startX = 50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180);
                            const startY = 50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180);
                            const endX = 50 + 50 * Math.cos((endAngle - 90) * Math.PI / 180);
                            const endY = 50 + 50 * Math.sin((endAngle - 90) * Math.PI / 180);
                            const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                            const pathData = `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                            // Poziția textului (centrul segmentului)
                            const textRadius = 30;
                            const textX = 50 + textRadius * Math.cos((midAngle - 90) * Math.PI / 180);
                            const textY = 50 + textRadius * Math.sin((midAngle - 90) * Math.PI / 180);

                            // Rotim textul pentru lizibilitate (dacă e întors)
                            const textRotation = (midAngle > 90 && midAngle < 70) ? midAngle + 180 : midAngle;

                            return (
                                <div key={prize.id} className="absolute inset-0">
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <path d={pathData} fill={prize.color} stroke="white" strokeWidth="0.5" />
                                        <text
                                            x={textX}
                                            y={textY}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="white"
                                            fontSize={prizes.length > 8 ? '2.5' : '3'}
                                            fontWeight="bold"
                                            fontFamily="DM Sans"
                                            style={{
                                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                                filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))'
                                            }}
                                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                                        >
                                            {prize.title}
                                        </text>
                                    </svg>
                                </div>
                            );
                        })}

                        {/* Buton central */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-[#38B275] z-10">
                            <Gift className="h-8 w-8 text-[#38B275]" />
                        </div>
                    </div>

                    {/* Pointer mic (alb) peste roată, dacă vrei încă unul:
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-white drop-shadow-lg" />
          </div> */}
                </div>
            </div>

            {/* Controls & Info */}
            <div className="text-center lg:text-left max-w-md">
                <h3 className="text-2xl lg:text-3xl font-bold text-white font-['Poppins'] mb-6">
                    Câștigă premii exclusive!
                </h3>
                <p className="text-white/80 font-['DM Sans'] mb-8 leading-relaxed">
                    Fiecare client DaCars are șansa să câștige reduceri speciale, upgrade-uri gratuite și multe alte beneficii.
                    Învârte roata și descoperă ce surpriză te așteaptă!
                </p>

                <div className="mb-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
                        <p className="text-white font-['DM Sans']">
                            Încercări rămase: <span className="font-bold text-[#38B275]">{spinsLeft}</span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={spinWheel}
                    disabled={isSpinning || spinsLeft <= 0}
                    aria-label="Învârte roata norocului"
                    className={`bg-[#38B275] text-white px-8 py-4 rounded-2xl text-lg font-bold font-['DM Sans'] transition-all duration-200 flex items-center justify-center mx-auto lg:mx-0 mb-4 ${
                        isSpinning || spinsLeft <= 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[#32a066] hover:shadow-xl hover:scale-105'
                    }`}
                >
                    {isSpinning ? (
                        <>
                            <RotateCcw className="h-6 w-6 mr-3 animate-spin" />
                            Se învârte...
                        </>
                    ) : spinsLeft <= 0 ? (
                        <>
                            <Gift className="h-6 w-6 mr-3" />
                            Încercări epuizate
                        </>
                    ) : (
                        <>
                            <Gift className="h-6 w-6 mr-3" />
                            Învârte Roata
                        </>
                    )}
                </button>

                {spinsLeft <= 0 && (
                    <button
                        onClick={resetSpins}
                        className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold font-['DM Sans'] hover:bg-white/30 transition-colors duration-200 flex items-center justify-center mx-auto lg:mx-0"
                    >
                        <RotateCcw className="h-5 w-5 mr-2" />
                        Resetează (Demo)
                    </button>
                )}

                <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2zl p-6">
                    <h4 className="text-lg font-semibold text-white font-['Poppins'] mb-3">
                        Regulament rapid:
                    </h4>
                    <ul className="text-white/80 font-['DM Sans'] text-sm space-y-2">
                        <li>• O încercare per client</li>
                        <li>• Premiul e valabil 30 de zile</li>
                        <li>• Se aplică la rezervări noi</li>
                        <li>• Nu se cumulează cu alte oferte</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    if (isPopup) {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-[#1A3661] to-[#2a4a73] rounded-3xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
                    {/* Close Button */}
                    <button
                        onClick={handleClosePopup}
                        aria-label="Închide popup"
                        className="absolute top-6 right-6 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors duration-200 z-10"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center mb-6">
                            <Sparkles className="h-8 w-8 text-[#38B275] mr-3" />
                            <h2 className="text-3xl lg:text-4xl font-bold text-white font-['Poppins']">
                                Bun venit la DaCars!
                            </h2>
                            <Sparkles className="h-8 w-8 text-[#38B275] ml-3" />
                        </div>
                        <p className="text-xl text-white/80 font-['DM Sans'] max-w-3xl mx-auto">
                            Înainte să explorezi ofertele noastre, încearcă-ți norocul la Roata Norocului și câștigă reduceri exclusive!
                        </p>
                    </div>

                    {wheelContent}
                    {winnerModal}
                </div>
            </div>
        );
    }

    return (
        <section id="wheel" className="py-20 lg:py-32 bg-gradient-to-br from-[#1A3661] to-[#2a4a73]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center mb-6">
                        <Sparkles className="h-8 w-8 text-[#38B275] mr-3" />
                        <h2 className="text-3xl lg:text-4xl font-bold text-white font-['Poppins']">
                            Roata Norocului DaCars
                        </h2>
                        <Sparkles className="h-8 w-8 text-[#38B275] ml-3" />
                    </div>
                    <p className="text-xl text-white/80 font-['DM Sans'] max-w-3xl mx-auto">
                        Încearcă-ți norocul și câștigă reduceri exclusive și beneficii speciale pentru următoarea ta rezervare!
                    </p>
                </div>

                {wheelContent}
            </div>

            {winnerModal}
        </section>
    );
};

export default WheelOfFortune;
