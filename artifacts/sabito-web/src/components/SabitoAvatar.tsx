/** Fixed-size, decorative brand image; adjacent text supplies the accessible name. */
export function SabitoAvatar({ size = 36 }: { size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}widget/sabito-avatar.webp`} alt="" width={size} height={size}
    className="shrink-0 rounded-full bg-white object-contain" style={{ width: size, height: size }} draggable={false} />;
}
