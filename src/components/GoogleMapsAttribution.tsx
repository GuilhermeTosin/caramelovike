export default function GoogleMapsAttribution() {
  return (
    <div className="flex justify-end border-t border-border/60 bg-white px-3 py-1.5">
      <img
        src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
        alt="Powered by Google"
        width={120}
        height={14}
        loading="lazy"
        className="h-[14px] w-[120px] object-contain"
      />
    </div>
  );
}
