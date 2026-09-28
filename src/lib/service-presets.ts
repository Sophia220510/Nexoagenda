export type ServicePreset = {
  name: string;
  price: string;
  duration_minutes: number;
};

const presets: Record<string, ServicePreset[]> = {
  BARBERSHOP: [
    { name: "Corte masculino", price: "40,00", duration_minutes: 45 },
    { name: "Barba", price: "30,00", duration_minutes: 30 },
    { name: "Corte + barba", price: "65,00", duration_minutes: 60 },
    { name: "Sobrancelha", price: "15,00", duration_minutes: 15 },
  ],
  SALON: [
    { name: "Corte feminino", price: "80,00", duration_minutes: 60 },
    { name: "Escova", price: "50,00", duration_minutes: 45 },
    { name: "Hidratação", price: "70,00", duration_minutes: 60 },
    { name: "Coloração", price: "150,00", duration_minutes: 120 },
    { name: "Manicure", price: "35,00", duration_minutes: 45 },
  ],
};

export function getServicePresets(businessType: string): ServicePreset[] {
  return (presets[businessType] ?? []).map((service) => ({ ...service }));
}
