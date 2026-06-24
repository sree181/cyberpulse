/**
 * ============================================================
 * BRANDING CONFIGURATION
 * ============================================================
 * 
 * Change these values to customize CyberPulse for your institution.
 * All components read from this single file — no need to hunt
 * through individual component files.
 * 
 * After changing values here, also update the CSS custom properties
 * in `client/src/index.css` to match your accent color in OKLCH format.
 * 
 * ============================================================
 */

export const BRANDING = {
  /** Institution name displayed in the header */
  institutionName: 'CYBERPULSE',
  
  /** Subtitle shown below the institution name */
  subtitle: 'BASY Data Immersion Lab',
  
  /** Path to the institution logo (use manus-upload-file --webdev for permanent URLs) */
  logoUrl: '/manus-storage/auburn-university-logo_da7b5f73.png',
  
  /** Alt text for accessibility */
  logoAlt: 'Auburn University',
  
  /** Primary brand color — used for arcs, highlights, active elements */
  accentColor: '#DD550C',
  
  /** Secondary brand color — used for backgrounds, subtle elements */
  navyColor: '#0C2340',
  
  /** Severity color scale (critical → low) */
  severityColors: {
    critical: '#C81E1E',
    high: '#DD550C',
    medium: '#D4A017',
    low: '#5C8A4D',
  },
  
  /** Attack type color palette — warm tones that complement the brand */
  attackColors: {
    'DDoS': '#C81E1E',
    'SSH Brute Force': '#DD550C',
    'SQL Injection': '#EE7624',
    'Phishing': '#D4A017',
    'Ransomware': '#9B1B30',
    'Port Scan': '#5C8A4D',
    'XSS': '#B8520F',
    'Malware C2': '#6B3FA0',
    'DNS Tunneling': '#3D6B8E',
    'Credential Stuffing': '#A0522D',
  },
} as const;

/**
 * ============================================================
 * HOW TO CUSTOMIZE FOR YOUR SCHOOL
 * ============================================================
 * 
 * 1. LOGO: Upload your school logo using:
 *    `manus-upload-file --webdev /path/to/your-logo.png`
 *    Then paste the returned URL into `logoUrl` above.
 * 
 * 2. COLORS: Change `accentColor` to your school's primary color.
 *    Then update the CSS variables in `client/src/index.css`:
 *    - `--color-cp-accent` (convert your hex to OKLCH format)
 *    - `--color-cp-accent-dim` (same hue, lower lightness)
 *    - `--primary` and related variables
 * 
 * 3. TEXT: Update `institutionName` and `subtitle` to match
 *    your department.
 * 
 * 4. SEVERITY COLORS: These can stay as-is for most schools.
 *    Only change if your school's primary color conflicts with
 *    the severity encoding (e.g., if your school color is red,
 *    you may want to shift critical to a darker shade).
 * 
 * ============================================================
 */
