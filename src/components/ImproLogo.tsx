/**
 * Logo improstd (sumber: repo improstd `core/public/logo-impro.svg`, path tidak diubah).
 * Cincin mengikuti `currentColor` (navy #032842 di tema terang, putih di gelap lewat className pemanggil);
 * kotak sudut tetap oranye #FF5E08. Favicon memakai logo yang sama di `src/app/icon.svg`.
 */
export default function ImproLogo({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="70 68 360 368"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M337.952 274.458C328.202 314.923 292.687 344.969 250.241 344.969C200.287 344.969 159.788 303.407 159.788 252.143C159.788 208.582 189.065 172.136 228.496 162.13V76.8667C143.663 87.8459 78.035 162.103 78.035 252.143C78.035 349.745 155.134 428.867 250.241 428.867C337.978 428.867 410.336 361.517 421.035 274.458H337.952Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
      />
      <path
        d="M423.035 120.873V246.867H337.427V162.54H255.035V74.8667H382.335V74.9107C394.825 75.1789 399.875 76.8278 405.1 79.6375C410.802 82.7594 415.242 87.35 418.333 93.1893C421.382 99.0725 423.035 104.868 423.035 120.873Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#FF5E08"
      />
    </svg>
  );
}
