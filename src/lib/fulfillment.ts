import type { FulfillmentMethod, TemperatureClass } from "@/lib/types";

/**
 * Compatibilité entre chaîne du froid et mode de réception.
 *
 * C'est une règle sanitaire, pas une préférence d'affichage : un produit
 * surgelé ne doit jamais partir par colis ordinaire. La matrice est
 * volontairement isolée ici pour être testable, et sera portée en base
 * (colonne `allowed_temperature_classes`) au lot 6 afin d'être modifiable
 * sans redéploiement.
 */
export const METHODS_BY_TEMPERATURE: Record<
  TemperatureClass,
  FulfillmentMethod[]
> = {
  ambient: ["pickup", "local_delivery", "shipping"],
  fresh: ["pickup", "local_delivery"],
  refrigerated: ["pickup", "local_delivery"],
  frozen: ["pickup", "local_delivery"],
};

export const ALL_METHODS: FulfillmentMethod[] = [
  "pickup",
  "local_delivery",
  "shipping",
];

/**
 * Modes de réception réellement possibles pour un panier : l'intersection
 * des modes autorisés par chacune de ses lignes. La contrainte la plus
 * stricte l'emporte.
 */
export function availableMethods(
  temperatures: TemperatureClass[],
): FulfillmentMethod[] {
  if (temperatures.length === 0) return [...ALL_METHODS];

  return ALL_METHODS.filter((method) =>
    temperatures.every((temperature) =>
      METHODS_BY_TEMPERATURE[temperature].includes(method),
    ),
  );
}

/**
 * Classe de température qui, dans un panier, exclut un mode donné.
 * Sert à expliquer au client *pourquoi* un mode n'est pas proposé plutôt
 * que de simplement griser un bouton.
 */
export function blockingTemperature(
  temperatures: TemperatureClass[],
  method: FulfillmentMethod,
): TemperatureClass | null {
  const order: TemperatureClass[] = [
    "frozen",
    "refrigerated",
    "fresh",
    "ambient",
  ];
  return (
    order.find(
      (temperature) =>
        temperatures.includes(temperature) &&
        !METHODS_BY_TEMPERATURE[temperature].includes(method),
    ) ?? null
  );
}
