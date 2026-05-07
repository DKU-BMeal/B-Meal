import React, { useState } from "react";
import { ChefHat } from "lucide-react";

export function ImageWithFallback({
  src,
  alt,
  className,
  style,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={style}
      >
        <ChefHat className="w-10 h-10 text-primary/70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
      {...rest}
    />
  );
}
