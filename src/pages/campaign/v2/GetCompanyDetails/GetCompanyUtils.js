export const brandDevMockData= {
    status: "ok",
    brand: {
      domain: "impelox.com",
      title: "Impelox",
      description: "Impelox Tech is an innovative company that leverages Artificial Intelligence to drive meaningful decision-making. They develop intelligent decision assistant systems that apply contextual analytics across various domains, including HR tech, edutech, healthcare, and e-commerce, using diverse data sources. By combining advances in machine learning, deep learning, and engineering, Impelox Tech builds AI agents, chatbots, and solutions for industries such as E-Commerce, Healthcare Tech, and Insurance Tech, helping businesses become AI-first.",
      slogan: "Empowering Decisions with Cutting-Edge AI Solutions for a Smarter World",
      colors: [
        {
          hex: "#ed834e",
          name: "Gravlax"
        },
        {
          hex: "#2e6bac",
          name: "Dover Straits"
        },
        {
          hex: "#e0e3e4",
          name: "Cold Wind"
        }
      ],
      logos: [
        {
          url: "https://media.brand.dev/93cbf155-dbd8-4090-8163-ca5bd1d58340.png",
          mode: "has_opaque_background",
          colors: [
            {
              hex: "#ed834e",
              name: "Gravlax"
            },
            {
              hex: "#2e6bac",
              name: "Dover Straits"
            },
            {
              hex: "#e0e3e4",
              name: "Cold Wind"
            }
          ],
          resolution: {
            width: 200,
            height: 200,
            aspect_ratio: 1
          },
          type: "icon"
        },
        {
          url: "https://media.brand.dev/8da6eced-f4b8-45a8-ae95-18aae6866aad.svg",
          mode: "light",
          colors: [
            {
              hex: "#f57a3b",
              name: "Sea Nettle"
            },
            {
              hex: "#2069b7",
              name: "Blue Streak"
            }
          ],
          resolution: {
            width: 3171,
            height: 1860,
            aspect_ratio: 1.7
          },
          type: "logo"
        },
        {
          url: "https://media.brand.dev/7778d584-7e74-4d92-bb54-e75fa18087fd.png",
          mode: "dark",
          colors: [
            {
              hex: "#f5783b",
              name: "Sea Nettle"
            }
          ],
          resolution: {
            width: 144,
            height: 144,
            aspect_ratio: 1
          },
          type: "icon"
        }
      ],
      backdrops: [],
      address: {
        city: "Kobe",
        country: "Japan",
        country_code: "JP"
      },
      socials: [
        {
          type: "facebook",
          url: "https://facebook.com/impelox-tech-private-limted-194412963931533"
        },
        {
          type: "linkedin",
          url: "https://linkedin.com/company/impelox-tech"
        }
      ],
      is_nsfw: false,
      industries: {
        eic: [
          {
            industry: "Technology",
            subindustry: "Artificial Intelligence & Machine Learning"
          },
          {
            industry: "Technology",
            subindustry: "Data Infrastructure & Analytics"
          },
          {
            industry: "Technology",
            subindustry: "Software (B2B)"
          }
        ]
      },
      links: {
        terms: null,
        contact: null,
        privacy: null,
        blog: null,
        pricing: null,
        careers: "https://impelox.com/careers",
        login: null,
        signup: null
      }
    },
    code: 200
  }

export  const businessCategories = [
    'Restaurant & Food Service',
    'Coffee Shop',
    'Retail & E-commerce',
    'Real Estate',
    'Home Services',
    'Health & Wellness',
    'Professional Services',
    'Automotive',
    'Education',
    'Entertainment & Events',
    'Non-Profit',
    'Artificial Intelligence & Machine Learning',
    'Other'
  ]


  export function getCompanyDomainFromUrl(url) {
    try {
      const normalizedUrl = url.startsWith('http')
        ? url
        : `https://${url}`;
  
      const hostname = new URL(normalizedUrl).hostname;
      return hostname.replace(/^www\./, '');
    } catch (e) {
      throw new Error('Error getting domain from URL');
    }
  }

export const masterCategories = [
  "Technology & Software",
  "Non-Profit & Government",
  "Agriculture",
  "Construction & Real Estate",
  "Media & Entertainment",
  "Education & Training",
  "Professional Services",
  "Travel & Hospitality",
  "Energy & Utilities",
  "Healthcare & Medical",
  "Finance & Insurance",
  "Manufacturing & Industrial",
  "Retail & Consumer Goods",
  "Food & Beverage",
  "Sports & Fitness"
];
  
