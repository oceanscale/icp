import React, { useState } from 'react';

/** Foto do perfil, ou a inicial do nome quando não há foto. */
export default function Avatar({ userId, name = '?', avatarAt, size = 28 }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.46) };
  const [failed, setFailed] = useState(null);
  if (avatarAt && userId && failed !== avatarAt) {
    return <img className="avatar avatar-img" style={style} src={`/api/avatars/${userId}?v=${avatarAt}`} alt="" aria-hidden="true" onError={() => setFailed(avatarAt)} />;
  }
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Reduz a foto escolhida para um quadrado de 256 px em JPEG. */
export function squareImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => reject(new Error('Não consegui ler essa imagem'));
    img.src = url;
  });
}
