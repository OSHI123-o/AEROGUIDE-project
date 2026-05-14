export interface DestinationPlace {
  name: string;
  description: string;
  image: string;
  category: "Famous" | "Hidden Gem" | "Food" | "Shopping";
}

export interface DestinationInfo {
  city: string;
  country: string;
  countryCode: string;
  overview: string;
  places: DestinationPlace[];
  countryInfo: {
    currency: string;
    language: string;
    highlights: string[];
    image: string;
  };
}

export const DESTINATION_DATA: Record<string, DestinationInfo> = {
  "Kuala Lumpur": {
    city: "Kuala Lumpur",
    country: "Malaysia",
    countryCode: "MY",
    overview: "Kuala Lumpur is the capital of Malaysia. Its modern skyline is dominated by the 451m-tall Petronas Twin Towers, a pair of glass-and-steel-clad skyscrapers with Islamic motifs.",
    countryInfo: {
      currency: "Malaysian Ringgit (MYR)",
      language: "Malay (Bahasa Malaysia)",
      highlights: [
        "Vibrant Multicultural Heritage",
        "World-Class Street Food",
        "Modern Infrastructure & Sky-high Architecture",
        "Tropical Rainforests within Reach"
      ],
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=2076&auto=format&fit=crop"
    },
    places: [
      {
        name: "Petronas Twin Towers",
        description: "The tallest twin towers in the world and the iconic symbol of modern KL.",
        image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=2071&auto=format&fit=crop",
        category: "Famous"
      },
      {
        name: "Batu Caves",
        description: "A limestone hill that has a series of caves and cave temples, featuring the massive gold statue of Lord Murugan.",
        image: "https://images.unsplash.com/photo-1596422846543-75c6fc18a5cf?q=80&w=2070&auto=format&fit=crop",
        category: "Famous"
      },
      {
        name: "Jalan Alor",
        description: "KL's most famous food street, offering an incredible variety of local Malaysian and Asian cuisine.",
        image: "https://images.unsplash.com/photo-1563245339-6b2e44c72243?q=80&w=2069&auto=format&fit=crop",
        category: "Food"
      },
      {
        name: "Pavilion Kuala Lumpur",
        description: "An award-winning premier shopping destination in the heart of Bukit Bintang.",
        image: "https://images.unsplash.com/photo-1555529669-2269763671c0?q=80&w=2070&auto=format&fit=crop",
        category: "Shopping"
      },
      {
        name: "Thean Hou Temple",
        description: "One of the oldest and largest Chinese temples in Southeast Asia, offering stunning views of the city.",
        image: "https://images.unsplash.com/photo-1571401835393-8c5f35328320?q=80&w=1974&auto=format&fit=crop",
        category: "Hidden Gem"
      }
    ]
  },
  "Dubai": {
    city: "Dubai",
    country: "UAE",
    countryCode: "AE",
    overview: "Dubai is a city and emirate in the United Arab Emirates known for luxury shopping, ultramodern architecture and a lively nightlife scene.",
    countryInfo: {
      currency: "UAE Dirham (AED)",
      language: "Arabic",
      highlights: [
        "World's Tallest Buildings",
        "Luxury Shopping Experience",
        "Stunning Desert Landscapes",
        "Futuristic Urban Design"
      ],
      image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2070&auto=format&fit=crop"
    },
    places: [
      {
        name: "Burj Khalifa",
        description: "The world's tallest building, providing panoramic views of the city from its observation decks.",
        image: "https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?q=80&w=2034&auto=format&fit=crop",
        category: "Famous"
      },
      {
        name: "Palm Jumeirah",
        description: "An artificial archipelago known for its glitzy hotels, posh apartment towers and upmarket restaurants.",
        image: "https://images.unsplash.com/photo-1582672093235-961858814529?q=80&w=1935&auto=format&fit=crop",
        category: "Famous"
      },
      {
        name: "Dubai Mall",
        description: "One of the world's largest shopping malls, featuring an aquarium, ice rink and over 1,200 shops.",
        image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop",
        category: "Shopping"
      }
    ]
  },
  "Singapore": {
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    overview: "Singapore is a sunny, tropical island in South-east Asia, off the southern tip of the Malay Peninsula.",
    countryInfo: {
      currency: "Singapore Dollar (SGD)",
      language: "English, Malay, Mandarin, Tamil",
      highlights: [
        "City in a Garden",
        "Gourmet Hawker Food",
        "Efficient Public Transport",
        "Melting Pot of Cultures"
      ],
      image: "https://images.unsplash.com/photo-1525625230556-8e8ad5aa3938?q=80&w=2014&auto=format&fit=crop"
    },
    places: [
      {
        name: "Gardens by the Bay",
        description: "A huge, colorful, futuristic park with iconic Supertree structures and flower domes.",
        image: "https://images.unsplash.com/photo-1525625230556-8e8ad5aa3938?q=80&w=2014&auto=format&fit=crop",
        category: "Famous"
      },
      {
        name: "Marina Bay Sands",
        description: "An integrated resort fronting Marina Bay, known for its iconic infinity pool on the roof.",
        image: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?q=80&w=2070&auto=format&fit=crop",
        category: "Famous"
      },
      {
        name: "Sentosa Island",
        description: "An island resort off Singapore’s southern coast, connected by road, cable car, pedestrian boardwalk and monorail.",
        image: "https://images.unsplash.com/photo-1516524316935-728b7e089201?q=80&w=2070&auto=format&fit=crop",
        category: "Famous"
      }
    ]
  }
};

export function getDestinationData(city: string): DestinationInfo | null {
  // Try exact match or find by inclusion
  if (DESTINATION_DATA[city]) return DESTINATION_DATA[city];
  
  const key = Object.keys(DESTINATION_DATA).find(k => city.includes(k) || k.includes(city));
  return key ? DESTINATION_DATA[key] : null;
}
