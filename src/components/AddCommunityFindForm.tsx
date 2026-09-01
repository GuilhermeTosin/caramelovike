import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommunityFindCategory } from "@/types/database";
import { createCommunityFind } from "@/services/communityFinds";
import { getApproxGeoByIp } from "@/lib/utils/geo";
import { uploadImage, generateImagePath } from "@/services/storage";
import { supabase } from "@/lib/supabase";
import AddressAutocomplete, { type AddressResult } from "@/components/AddressAutocomplete";

const CATEGORY_OPTIONS: Array<{ value: CommunityFindCategory; label: string }> = [
  { value: "comida", label: "Comida" },
  { value: "beleza", label: "Beleza" },
  { value: "casa", label: "Casa" },
  { value: "outros", label: "Outros" },
];

const CATEGORY_LABELS_EN: Record<CommunityFindCategory, string> = {
  comida: "Food",
  beleza: "Beauty",
  casa: "Home",
  outros: "Other",
};

type Props = {
  onCreated?: () => void;
};

export default function AddCommunityFindForm({ onCreated }: Props) {
  const locale = "pt-BR";

  const text = {
        required: "Preencha o nome do produto, o nome do local e o endereço.",
        uploadError: "Não foi possível enviar a foto do achadinho.",
        publishError: "Não foi possível publicar o achadinho.",
        publishedWithPlace: "Achadinho publicado com sucesso com a localização do local selecionado.",
        published: "Achadinho publicado com sucesso.",
        publishedWithIp: "Achadinho publicado com sucesso usando localização aproximada por IP.",
        geolocationError: "Não foi possível obter sua localização (GPS/IP).",
        title: "Adicionar Achadinho",
        description: "Compartilhe uma descoberta da comunidade com localização precisa do local.",
        productName: "Nome do produto",
        placeName: "Nome do local",
        address: "Endereço/local",
        exactLocationHint: "Selecione uma opção da lista para usar a localização exata do local.",
        category: "Categoria",
        selectCategory: "Selecione a categoria",
        photo: "Foto do achadinho (opcional)",
        formats: "Formatos aceitos: JPG, PNG e WEBP. Recomendado até 5 MB.",
        preview: "Preview do achadinho",
        remove: "Remover",
        publishing: "Publicando...",
        publish: "Publicar achadinho",
      };
  const [productName, setProductName] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<AddressResult | null>(null);
  const [category, setCategory] = useState<CommunityFindCategory>("comida");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!productName.trim() || !placeName.trim() || !locationAddress.trim()) {
      setError(text.required);
      return;
    }

    setLoading(true);

    const publishWithCoords = async (
      coords: { lat: number; lng: number; accuracy?: number | null },
      source: "gps" | "ip" | "place"
    ) => {
      let photoUrl: string | null = null;
      if (photoFile) {
        const { data: authData } = await supabase.auth.getUser();
        const ownerId = authData.user?.id || "community";
        const path = generateImagePath(ownerId, "photo", photoFile.name);
        photoUrl = await uploadImage("business-images", path, photoFile);
        if (!photoUrl) {
          setError(text.uploadError);
          setLoading(false);
          return;
        }
      }

      const result = await createCommunityFind({
        productName: productName.trim(),
        locationName: `${placeName.trim()} - ${locationAddress.trim()}`,
        category,
        lat: coords.lat,
        lng: coords.lng,
        accuracyMeters: coords.accuracy ?? null,
        photoUrl,
      });

      if (!result.ok) {
        setError(result.error || text.publishError);
        setLoading(false);
        return;
      }

      setProductName("");
      setPlaceName("");
      setLocationAddress("");
      setSelectedPlace(null);
      setCategory("comida");
      setPhotoFile(null);
      setPhotoPreview(null);
      setSuccess(
        source === "place"
          ? text.publishedWithPlace
          : source === "gps"
            ? text.published
            : text.publishedWithIp
      );
      setLoading(false);
      onCreated?.();
    };

    const tryIpFallback = async () => {
      const approx = await getApproxGeoByIp();
      if (!approx) {
        setLoading(false);
        setError(text.geolocationError);
        return;
      }
      await publishWithCoords({ lat: approx.lat, lng: approx.lng, accuracy: null }, "ip");
    };

    if (selectedPlace && Number.isFinite(selectedPlace.lat) && Number.isFinite(selectedPlace.lng)) {
      await publishWithCoords(
        { lat: selectedPlace.lat, lng: selectedPlace.lng, accuracy: null },
        "place"
      );
      return;
    }

    if (!navigator.geolocation) {
      await tryIpFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await publishWithCoords(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          "gps"
        );
      },
      async () => {
        await tryIpFallback();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <Card className="p-4 sm:p-6 border-border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{text.title}</h3>
        <p className="text-sm text-muted-foreground">
          {text.description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="find-product-name">{text.productName}</Label>
          <Input
            id="find-product-name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={"Ex.: Guaraná Antarctica"}
            maxLength={140}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="find-place-name">{text.placeName}</Label>
          <Input
            id="find-place-name"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder={"Ex.: Walmart Downtown Montreal"}
            maxLength={180}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="find-location-name">{text.address}</Label>
          <AddressAutocomplete
            value={locationAddress}
            onChange={(address) => {
              setLocationAddress(address);
              setSelectedPlace(null);
            }}
            onPlaceSelected={(place) => {
              setSelectedPlace(place);
              setLocationAddress(place.formattedAddress || `${place.city}, ${place.country}`);
            }}
            placeholder={"Ex.: Walmart, 123 Main St, Montreal"}
          />
          <p className="text-xs text-muted-foreground">
            {text.exactLocationHint}
          </p>
        </div>

        <div className="space-y-2">
          <Label>{text.category}</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as CommunityFindCategory)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={text.selectCategory} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="find-photo">{text.photo}</Label>
          <input
            id="find-photo"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setPhotoFile(file);
              if (!file) {
                setPhotoPreview(null);
                return;
              }
              setPhotoPreview(URL.createObjectURL(file));
            }}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            {text.formats}
          </p>
          {photoPreview ? (
            <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-border">
              <img src={photoPreview} alt={text.preview} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded"
              >
                {text.remove}
              </button>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {text.publishing}
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              {text.publish}
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
