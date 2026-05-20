"use client";

import React from 'react';

export default function Loading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          {/* Premium orange glow shadow */}
          <div className="absolute -inset-6 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
          <img 
            src="/icon.svg" 
            alt="Flow Events Logo" 
            className="h-20 w-20 animate-bounce"
          />
        </div>
        <span className="font-black uppercase text-[10px] tracking-[0.3em] text-primary/50 italic animate-pulse">
          Carregando painel...
        </span>
      </div>
    </div>
  );
}
