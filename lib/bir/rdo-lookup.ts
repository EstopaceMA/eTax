/**
 * BIR Revenue District Offices.
 *
 * `rdoDistricts` is the full picker list. `lookupRdoCode` suggests a default
 * from the taxpayer's address — a starting point only, since RDO assignment
 * follows where someone registered rather than where they currently live.
 */

export type RdoDistrict = {
  code: string;
  office: string;
};

export const rdoDistricts: RdoDistrict[] = [
  { code: "001", office: "Laoag City" },
  { code: "002", office: "Vigan" },
  { code: "003", office: "San Fernando, La Union" },
  { code: "004", office: "Calasiao, West Pangasinan" },
  { code: "005", office: "Alaminos, Pangasinan" },
  { code: "006", office: "Urdaneta, Pangasinan" },
  { code: "007", office: "Bangued, Abra" },
  { code: "008", office: "Baguio City" },
  { code: "009", office: "La Trinidad, Benguet" },
  { code: "010", office: "Bontoc, Mt. Province" },
  { code: "011", office: "Tabuk City, Kalinga" },
  { code: "012", office: "Lagawe, Ifugao" },
  { code: "013", office: "Tuguegarao, Cagayan" },
  { code: "014", office: "Bayombong, Nueva Vizcaya" },
  { code: "015", office: "Naguilian, Isabela" },
  { code: "016", office: "Cabarroguis, Quirino" },
  { code: "17A", office: "Tarlac City" },
  { code: "17B", office: "Paniqui, Tarlac" },
  { code: "018", office: "Olongapo City" },
  { code: "019", office: "Subic Bay Freeport Zone" },
  { code: "020", office: "Balanga, Bataan" },
  { code: "21A", office: "North Pampanga" },
  { code: "21B", office: "South Pampanga" },
  { code: "21C", office: "Clark Freeport Zone" },
  { code: "022", office: "Baler, Aurora" },
  { code: "23A", office: "North Nueva Ecija" },
  { code: "23B", office: "South Nueva Ecija" },
  { code: "024", office: "Valenzuela City" },
  { code: "25A", office: "Plaridel, Bulacan" },
  { code: "25B", office: "Sta. Maria, Bulacan" },
  { code: "026", office: "Malabon-Navotas" },
  { code: "027", office: "Caloocan City" },
  { code: "028", office: "Novaliches" },
  { code: "029", office: "Tondo - San Nicolas" },
  { code: "030", office: "Binondo" },
  { code: "031", office: "Sta. Cruz" },
  { code: "032", office: "Quiapo-Sampaloc-San Miguel-Sta. Mesa" },
  { code: "033", office: "Intramuros-Ermita-Malate" },
  { code: "034", office: "Paco-Pandacan-Sta. Ana-San Andres" },
  { code: "035", office: "Romblon" },
  { code: "036", office: "Puerto Princesa" },
  { code: "037", office: "San Jose, Occidental Mindoro" },
  { code: "038", office: "North Quezon City" },
  { code: "039", office: "South Quezon City" },
  { code: "040", office: "Cubao" },
  { code: "041", office: "Mandaluyong City" },
  { code: "042", office: "San Juan" },
  { code: "043", office: "Pasig" },
  { code: "044", office: "Taguig-Pateros" },
  { code: "045", office: "Marikina" },
  { code: "046", office: "Cainta-Taytay" },
  { code: "047", office: "East Makati" },
  { code: "048", office: "West Makati" },
  { code: "049", office: "North Makati" },
  { code: "050", office: "South Makati" },
  { code: "051", office: "Pasay City" },
  { code: "052", office: "Parañaque" },
  { code: "53A", office: "Las Piñas City" },
  { code: "53B", office: "Muntinlupa City" },
  { code: "54A", office: "Trece Martires City, East Cavite" },
  { code: "54B", office: "Kawit, West Cavite" },
  { code: "055", office: "San Pablo City" },
  { code: "056", office: "Calamba" },
  { code: "057", office: "Biñan" },
  { code: "058", office: "Batangas City" },
  { code: "059", office: "Lipa City" },
  { code: "060", office: "Lucena City" },
  { code: "061", office: "Gumaca, Quezon" },
  { code: "062", office: "Boac, Marinduque" },
  { code: "063", office: "Calapan, Oriental Mindoro" },
  { code: "064", office: "Talisay, Camarines Norte" },
  { code: "065", office: "Naga City" },
  { code: "066", office: "Iriga City" },
  { code: "067", office: "Legazpi City" },
  { code: "068", office: "Sorsogon" },
  { code: "069", office: "Virac, Catanduanes" },
  { code: "070", office: "Masbate" },
  { code: "071", office: "Kalibo, Aklan" },
  { code: "072", office: "Roxas City" },
  { code: "073", office: "San Jose, Antique" },
  { code: "074", office: "Iloilo City" },
  { code: "075", office: "Zarraga, Iloilo" },
  { code: "076", office: "Victorias City" },
  { code: "077", office: "Bacolod City" },
  { code: "078", office: "Binalbagan" },
  { code: "079", office: "Dumaguete City" },
  { code: "080", office: "Mandaue City" },
  { code: "081", office: "Cebu City North" },
  { code: "082", office: "Cebu City South" },
  { code: "083", office: "Talisay City, Cebu" },
  { code: "084", office: "Tagbilaran City" },
  { code: "085", office: "Catarman" },
  { code: "086", office: "Borongan" },
  { code: "087", office: "Calbayog City" },
  { code: "088", office: "Tacloban City" },
  { code: "089", office: "Ormoc City" },
  { code: "090", office: "Maasin" },
  { code: "091", office: "Dipolog City" },
  { code: "092", office: "Pagadian City" },
  { code: "93A", office: "Zamboanga City" },
  { code: "93B", office: "Ipil, Zamboanga Sibugay" },
  { code: "094", office: "Isabela, Basilan" },
  { code: "095", office: "Jolo, Sulu" },
  { code: "096", office: "Bongao, Tawi-Tawi" },
  { code: "097", office: "Gingoog City" },
  { code: "098", office: "Cagayan de Oro City" },
  { code: "099", office: "Malaybalay City" },
  { code: "100", office: "Ozamis City" },
  { code: "101", office: "Iligan City" },
  { code: "102", office: "Marawi City" },
  { code: "103", office: "Butuan City" },
  { code: "104", office: "Bayugan City" },
  { code: "105", office: "Surigao City" },
  { code: "106", office: "Tandag" },
  { code: "107", office: "Cotabato City" },
  { code: "108", office: "Kidapawan" },
  { code: "109", office: "Tacurong" },
  { code: "110", office: "General Santos City" },
  { code: "111", office: "Koronadal City" },
  { code: "112", office: "Tagum" },
  { code: "113A", office: "West Davao City" },
  { code: "113B", office: "East Davao City" },
  { code: "114", office: "Mati" },
  { code: "115", office: "Digos" },
];

export function getRdoOffice(code: string | null | undefined) {
  return rdoDistricts.find((district) => district.code === code)?.office ?? null;
}

/** Normalises SSO address values: "CITY OF GENERAL TRIAS" -> "GENERAL TRIAS". */
function normalise(value: string) {
  return value
    .toUpperCase()
    .replace(/\bCITY OF\b/g, " ")
    .replace(/\bCITY\b/g, " ")
    .replace(/\bMUNICIPALITY OF\b/g, " ")
    .replace(/[^A-Z0-9ÑÁÉÍÓÚ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** City/municipality -> RDO code, where one province holds several districts. */
const municipalityRdo: Record<string, string> = {
  // Manila districts
  TONDO: "029",
  "SAN NICOLAS": "029",
  BINONDO: "030",
  "STA CRUZ": "031",
  QUIAPO: "032",
  SAMPALOC: "032",
  "SAN MIGUEL": "032",
  "STA MESA": "032",
  INTRAMUROS: "033",
  ERMITA: "033",
  MALATE: "033",
  PACO: "034",
  PANDACAN: "034",
  "STA ANA": "034",
  "SAN ANDRES": "034",
  MANILA: "033",
  // Rest of Metro Manila
  VALENZUELA: "024",
  MALABON: "026",
  NAVOTAS: "026",
  CALOOCAN: "027",
  NOVALICHES: "028",
  QUEZON: "039",
  CUBAO: "040",
  MANDALUYONG: "041",
  "SAN JUAN": "042",
  PASIG: "043",
  TAGUIG: "044",
  PATEROS: "044",
  MARIKINA: "045",
  CAINTA: "046",
  TAYTAY: "046",
  MAKATI: "047",
  PASAY: "051",
  PARANAQUE: "052",
  "PARAÑAQUE": "052",
  "LAS PINAS": "53A",
  "LAS PIÑAS": "53A",
  MUNTINLUPA: "53B",
  // Pangasinan
  ALAMINOS: "005",
  CALASIAO: "004",
  DAGUPAN: "004",
  URDANETA: "006",
  // Cavite
  "TRECE MARTIRES": "54A",
  DASMARINAS: "54A",
  "DASMARIÑAS": "54A",
  TAGAYTAY: "54A",
  KAWIT: "54B",
  BACOOR: "54B",
  IMUS: "54B",
  "GENERAL TRIAS": "54B",
  // Laguna
  "SAN PABLO": "055",
  CALAMBA: "056",
  "SANTA ROSA": "056",
  "STA ROSA": "056",
  BINAN: "057",
  "BIÑAN": "057",
  "SAN PEDRO": "057",
  // Cebu / Davao
  MANDAUE: "080",
  CEBU: "082",
  TALISAY: "083",
  DAVAO: "113A",
  TAGUM: "112",
  DIGOS: "115",
};

/** Province-level fallback when the city/municipality is unknown. */
const provinceRdo: Record<string, string> = {
  "ILOCOS NORTE": "001",
  "ILOCOS SUR": "002",
  "LA UNION": "003",
  PANGASINAN: "004",
  ABRA: "007",
  BENGUET: "009",
  "MOUNTAIN PROVINCE": "010",
  KALINGA: "011",
  IFUGAO: "012",
  CAGAYAN: "013",
  "NUEVA VIZCAYA": "014",
  ISABELA: "015",
  QUIRINO: "016",
  TARLAC: "17A",
  ZAMBALES: "018",
  BATAAN: "020",
  PAMPANGA: "21A",
  AURORA: "022",
  "NUEVA ECIJA": "23A",
  BULACAN: "25A",
  "METRO MANILA": "039",
  NCR: "039",
  RIZAL: "046",
  ROMBLON: "035",
  PALAWAN: "036",
  "OCCIDENTAL MINDORO": "037",
  "ORIENTAL MINDORO": "063",
  CAVITE: "54B",
  LAGUNA: "056",
  BATANGAS: "058",
  QUEZON: "060",
  MARINDUQUE: "062",
  "CAMARINES NORTE": "064",
  "CAMARINES SUR": "065",
  ALBAY: "067",
  SORSOGON: "068",
  CATANDUANES: "069",
  MASBATE: "070",
  AKLAN: "071",
  CAPIZ: "072",
  ANTIQUE: "073",
  ILOILO: "074",
  "NEGROS OCCIDENTAL": "077",
  "NEGROS ORIENTAL": "079",
  CEBU: "082",
  BOHOL: "084",
  "NORTHERN SAMAR": "085",
  "EASTERN SAMAR": "086",
  SAMAR: "087",
  LEYTE: "088",
  "SOUTHERN LEYTE": "090",
  "ZAMBOANGA DEL NORTE": "091",
  "ZAMBOANGA DEL SUR": "092",
  "ZAMBOANGA SIBUGAY": "93B",
  BASILAN: "094",
  SULU: "095",
  "TAWI-TAWI": "096",
  "MISAMIS ORIENTAL": "098",
  BUKIDNON: "099",
  "MISAMIS OCCIDENTAL": "100",
  "LANAO DEL NORTE": "101",
  "LANAO DEL SUR": "102",
  "AGUSAN DEL NORTE": "103",
  "AGUSAN DEL SUR": "104",
  "SURIGAO DEL NORTE": "105",
  "SURIGAO DEL SUR": "106",
  COTABATO: "107",
  "NORTH COTABATO": "108",
  "SULTAN KUDARAT": "109",
  "SOUTH COTABATO": "110",
  "DAVAO DEL NORTE": "112",
  "DAVAO CITY": "113A",
  "DAVAO ORIENTAL": "114",
  "DAVAO DEL SUR": "115",
};

/**
 * Suggests an RDO code from an SSO address. Returns null for foreign or
 * unrecognised addresses so the taxpayer can pick one themselves.
 */
export function lookupRdoCode({
  municipality,
  province,
}: {
  municipality?: string | null;
  province?: string | null;
}): RdoDistrict | null {
  if (municipality) {
    const key = normalise(municipality);

    const direct = municipalityRdo[key];
    if (direct) {
      return { code: direct, office: getRdoOffice(direct) ?? "" };
    }

    // SSO returns compound names, e.g. "CITY OF MANILA - TONDO I/II".
    for (const [name, code] of Object.entries(municipalityRdo)) {
      if (key.includes(name)) {
        return { code, office: getRdoOffice(code) ?? "" };
      }
    }
  }

  if (province) {
    const code = provinceRdo[normalise(province)];
    if (code) {
      return { code, office: getRdoOffice(code) ?? "" };
    }
  }

  return null;
}
