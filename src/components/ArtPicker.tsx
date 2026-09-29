import { useRef, useState } from 'react'
import type { IllustrationKey } from '../types'
import { db } from '../lib/db'
import { compressImage } from '../lib/image'
import { ILLUSTRATIONS, Illustration, illustrationLabel } from '../lib/illustrations'
import { Img, primeImage } from './Img'
import { UploadIcon } from './icons'

interface Props {
  value: IllustrationKey
  image: string | null
  onChange(key: IllustrationKey): void
  onImage(ref: string | null): void
  /** Used to build unique element ids. */
  idPrefix: string
}

export function ArtPicker({ value, image, onChange, onImage, idPrefix }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const dataUrl = await compressImage(file)
      const ref = await db.uploadImage(dataUrl)
      primeImage(ref, dataUrl)
      onImage(ref)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The image could not be uploaded.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="artpicker">
      <div className="picker" role="group" aria-label="Illustration">
        {ILLUSTRATIONS.map((item) => (
          <button
            type="button"
            key={item.key}
            className="picker-item"
            aria-pressed={!image && value === item.key}
            title={item.label}
            aria-label={item.label}
            onClick={() => {
              onChange(item.key)
              if (image) onImage(null)
            }}
          >
            <Illustration k={item.key} size={30} />
          </button>
        ))}
      </div>
      <div className="artpicker-foot">
        {image ? <Img src={image} className="upload-thumb" /> : null}
        <span className="picker-label">{image ? 'Custom image' : illustrationLabel(value)}</span>
        <input
          ref={inputRef}
          id={`${idPrefix}-file`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          <UploadIcon size={15} />
          {busy ? 'Uploading…' : image ? 'Replace image' : 'Upload image'}
        </button>
        {image && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onImage(null)}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
