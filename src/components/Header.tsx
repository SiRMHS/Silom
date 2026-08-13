"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "خانه", href: "#" },
  { label: "پروژه‌ها", href: "#projects" },
  { label: "خدمات خلاق", href: "#services" },
  { label: "آژانس ما", href: "#about" },
  { label: "تماس", href: "#contact" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Main Header Container */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 md:px-12 py-6",
          scrolled 
            ? "bg-black/80 backdrop-blur-xl border-b border-brand-brown/20 py-4" 
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Right Section: Brand Logo (RTL) */}
          <a href="#" className="group relative overflow-hidden flex items-center">
            <motion.span 
              className="text-2xl md:text-3xl font-black tracking-tight text-white transition-colors duration-300 group-hover:text-peach"
              whileHover={{ scale: 1.02 }}
            >
              رهیاد
            </motion.span>
            <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-peach transition-all duration-300 group-hover:w-full" />
          </a>

          {/* Center Section: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-10">
            {NAV_ITEMS.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="relative group text-sm font-medium text-light-gray/70 hover:text-white transition-colors duration-300 py-2"
              >
                <span className="relative z-10">{item.label}</span>
                {/* Floating circle indicator on hover */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-peach opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* Left Section: Action Button & Mobile Toggle */}
          <div className="flex items-center gap-4">
            {/* Magnetic-style CTA Button (Desktop) */}
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-brown text-peach border border-brand-brown hover:bg-peach hover:text-brand-brown transition-colors duration-500 font-medium text-sm"
            >
              <span>شروع یک داستان جدید</span>
              <ArrowLeft className="w-4 h-4" />
            </motion.a>

            {/* Hamburger Button (Mobile) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden flex items-center justify-center w-12 h-12 rounded-full border border-light-gray/20 hover:border-peach hover:bg-brand-brown/10 text-white transition-all duration-300 z-50"
              aria-label="منو"
            >
              {isOpen ? <X className="w-5 h-5 text-peach" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </motion.header>

      {/* Full-screen Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-black flex flex-col justify-between p-8 md:hidden"
          >
            {/* Decorative colored lights */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand-brown/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-peach/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col mt-24 gap-6 z-10">
              <span className="text-xs uppercase tracking-widest text-light-gray/40 font-bold border-b border-brand-brown/30 pb-2">
                ناوبری آژانس
              </span>
              <div className="flex flex-col gap-4">
                {NAV_ITEMS.map((item, index) => (
                  <motion.a
                    key={index}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 50, opacity: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-4xl font-extrabold text-light-gray hover:text-peach transition-colors duration-300"
                  >
                    {item.label}
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Mobile Footer Area */}
            <div className="flex flex-col gap-4 border-t border-brand-brown/20 pt-6 z-10">
              <span className="text-xs text-light-gray/40">طراحی شده با عشق در آژانس رهیاد</span>
              <div className="flex gap-4 text-sm text-peach font-semibold">
                <a href="#" className="hover:underline">اینستاگرام</a>
                <a href="#" className="hover:underline">لینکدین</a>
                <a href="#" className="hover:underline">تلگرام</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
