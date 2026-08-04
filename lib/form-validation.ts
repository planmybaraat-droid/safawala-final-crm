export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

interface ValidationResult {
  isValid: boolean
  error: string | null
}

export function validatePhoneWithCountry(phone: string): ValidationResult {
  const clean = phone.replace(/[\s\-()]/g, "")
  if (!clean) {
    return { isValid: false, error: "Phone number is required" }
  }

  // Country code configuration mapping to expected subscriber number lengths (digits after country code)
  const countryLengths: Record<string, number | number[]> = {
    "1": 10,       // USA/Canada
    "7": 10,       // Russia/Kazakhstan
    "20": 10,      // Egypt
    "27": 9,       // South Africa
    "30": 10,      // Greece
    "31": 9,       // Netherlands
    "32": 9,       // Belgium
    "33": 9,       // France
    "34": 9,       // Spain
    "36": 9,       // Hungary
    "39": 10,      // Italy
    "40": 9,       // Romania
    "41": 9,       // Switzerland
    "43": 10,      // Austria
    "44": 10,      // UK
    "45": 8,       // Denmark
    "46": 9,       // Sweden
    "47": 8,       // Norway
    "48": 9,       // Poland
    "49": [10, 11],// Germany
    "51": 9,       // Peru
    "52": 10,      // Mexico
    "53": 8,       // Cuba
    "54": 10,      // Argentina
    "55": 11,      // Brazil
    "56": 9,       // Chile
    "57": 10,      // Colombia
    "58": 10,      // Venezuela
    "60": [9, 10], // Malaysia
    "61": 9,       // Australia
    "62": [9, 10, 11, 12], // Indonesia
    "63": 10,      // Philippines
    "64": [8, 9, 10], // New Zealand
    "65": 8,       // Singapore
    "66": 9,       // Thailand
    "81": 10,      // Japan
    "82": [9, 10], // South Korea
    "84": [9, 10], // Vietnam
    "86": 11,      // China
    "90": 10,      // Turkey
    "91": 10,      // India
    "92": 10,      // Pakistan
    "93": 9,       // Afghanistan
    "94": 9,       // Sri Lanka
    "95": 9,       // Myanmar
    "98": 10,      // Iran
    "212": 9,      // Morocco
    "213": 9,      // Algeria
    "216": 8,      // Tunisia
    "218": 9,      // Libya
    "220": 7,      // Gambia
    "233": 9,      // Ghana
    "234": 10,     // Nigeria
    "254": 9,      // Kenya
    "256": 9,      // Uganda
    "351": 9,      // Portugal
    "352": 9,      // Luxembourg
    "353": 9,      // Ireland
    "354": 7,      // Iceland
    "358": 9,      // Finland
    "359": 9,      // Bulgaria
    "370": 8,      // Lithuania
    "371": 8,      // Latvia
    "372": [7, 8], // Estonia
    "380": 9,      // Ukraine
    "381": 9,      // Serbia
    "382": 8,      // Montenegro
    "385": 9,      // Croatia
    "386": 8,      // Slovenia
    "387": 8,      // Bosnia
    "389": 8,      // North Macedonia
    "420": 9,      // Czech Republic
    "421": 9,      // Slovakia
    "502": 8,      // Guatemala
    "503": 8,      // El Salvador
    "504": 8,      // Honduras
    "505": 8,      // Nicaragua
    "506": 8,      // Costa Rica
    "507": 8,      // Panama
    "593": 9,      // Ecuador
    "595": 9,      // Paraguay
    "598": 8,      // Uruguay
    "852": 8,      // Hong Kong
    "853": 8,      // Macau
    "855": 9,      // Cambodia
    "856": 9,      // Laos
    "880": 10,     // Bangladesh
    "886": 9,      // Taiwan
    "960": 7,      // Maldives
    "961": 8,      // Lebanon
    "962": 9,      // Jordan
    "963": 9,      // Syria
    "964": 10,     // Iraq
    "965": 8,      // Kuwait
    "966": 9,      // Saudi Arabia
    "971": 9,      // UAE
    "972": 9,      // Israel
    "973": 8,      // Bahrain
    "974": 8,      // Qatar
    "977": 10,     // Nepal
  }

  let matchedCountryCode = ""
  let restNumber = ""

  if (clean.startsWith("+")) {
    const withoutPlus = clean.substring(1)
    
    // Check 3-digit country codes first
    if (withoutPlus.length >= 3 && countryLengths[withoutPlus.substring(0, 3)] !== undefined) {
      matchedCountryCode = withoutPlus.substring(0, 3)
      restNumber = withoutPlus.substring(3)
    }
    // Check 2-digit country codes
    else if (withoutPlus.length >= 2 && countryLengths[withoutPlus.substring(0, 2)] !== undefined) {
      matchedCountryCode = withoutPlus.substring(0, 2)
      restNumber = withoutPlus.substring(2)
    }
    // Check 1-digit country codes
    else if (withoutPlus.length >= 1 && countryLengths[withoutPlus.substring(0, 1)] !== undefined) {
      matchedCountryCode = withoutPlus.substring(0, 1)
      restNumber = withoutPlus.substring(1)
    }
    // Unknown country code
    else {
      // Fallback: If starts with + but unknown country code, check if it has at least 8 digits
      if (withoutPlus.length < 8) {
        return { isValid: false, error: "Please enter a valid phone number" }
      }
      return { isValid: true, error: null }
    }
  } else {
    // If it doesn't start with +, check if it looks like an Indian number with 91 or without prefix
    if (clean.length === 12 && clean.startsWith("91")) {
      matchedCountryCode = "91"
      restNumber = clean.substring(2)
    } else if (clean.length === 10) {
      matchedCountryCode = "91"
      restNumber = clean
    } else {
      // General fallback if no + sign
      if (clean.length < 10) {
        return { isValid: false, error: "Please enter a valid 10-digit number" }
      }
      // Check if the prefix matches a country code
      let found = false
      for (const len of [3, 2, 1]) {
        const prefix = clean.substring(0, len)
        if (countryLengths[prefix] !== undefined) {
          matchedCountryCode = prefix
          restNumber = clean.substring(len)
          found = true
          break
        }
      }
      if (!found) {
        return { isValid: false, error: "Please enter a valid phone number" }
      }
    }
  }

  // Validate the matched number length
  const expected = countryLengths[matchedCountryCode]
  const restLength = restNumber.length

  if (Array.isArray(expected)) {
    if (!expected.includes(restLength)) {
      const min = Math.min(...expected)
      const max = Math.max(...expected)
      return {
        isValid: false,
        error: `Please enter a valid ${min === max ? min : min + "-" + max}-digit number for country code +${matchedCountryCode}`
      }
    }
  } else {
    if (restLength !== expected) {
      return {
        isValid: false,
        error: `Please enter a valid ${expected}-digit number for country code +${matchedCountryCode}`
      }
    }
  }

  // Ensure rest is purely numeric
  if (restLength > 0 && !/^\d+$/.test(restNumber)) {
    return { isValid: false, error: "Phone number can only contain digits" }
  }

  return { isValid: true, error: null }
}

export const validatePhone = (phone: string): boolean => {
  return validatePhoneWithCountry(phone).isValid
}

export const validatePincode = (pincode: string): boolean => {
  return /^\d{6}$/.test(pincode)
}

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0
}

export const getValidationError = (
  field: string,
  value: string,
  type: "required" | "email" | "phone" | "pincode",
): string | null => {
  switch (type) {
    case "required":
      return validateRequired(value) ? null : `${field} is required`
    case "email":
      return validateEmail(value) ? null : "Please enter a valid email address"
    case "phone":
      return validatePhone(value) ? null : "Please enter a valid phone number"
    case "pincode":
      return validatePincode(value) ? null : "Please enter a valid 6-digit pincode"
    default:
      return null
  }
}
