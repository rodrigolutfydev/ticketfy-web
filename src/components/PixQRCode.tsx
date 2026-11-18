"use client"

import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, QrCode } from "lucide-react"
import { useState } from "react"

interface PixQRCodeProps {
  pixCopyPaste: string
  amount: number
}

export function PixQRCode({
  pixCopyPaste,
  amount,
}: PixQRCodeProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!pixCopyPaste) return

    try {
      await navigator.clipboard.writeText(pixCopyPaste)

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setCopied(false)
    }
  }

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-[#111114] p-6 md:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          <QrCode size={28} />
        </div>

        <h2 className="text-2xl font-semibold text-white">
          Seu Pix está pronto
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          Escaneie o QR Code ou utilize o Pix copia e cola.
        </p>

        <p className="mt-6 text-3xl font-bold text-white">
          {formattedAmount}
        </p>

        <div className="mt-7 rounded-2xl bg-white p-5">
          {pixCopyPaste ? (
            <QRCodeSVG
              value={pixCopyPaste}
              size={240}
              level="M"
              marginSize={0}
              bgColor="#FFFFFF"
              fgColor="#000000"
              title="QR Code para pagamento Pix"
            />
          ) : (
            <div className="flex h-[240px] w-[240px] items-center justify-center text-sm text-zinc-500">
              QR Code indisponível
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-zinc-400">
          Abra o aplicativo do seu banco para pagar.
        </p>
      </div>

      <div className="mt-8">
        <label className="mb-3 block text-sm font-medium text-white">
          Pix copia e cola
        </label>

        <div className="break-all rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
          {pixCopyPaste || "Código Pix indisponível"}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!pixCopyPaste}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-semibold text-black transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check size={18} />
              Código copiado!
            </>
          ) : (
            <>
              <Copy size={18} />
              Copiar código Pix
            </>
          )}
        </button>
      </div>
    </div>
  )
}