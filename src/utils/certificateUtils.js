// Constants
const CERTIFICATES_KEY = 'st_energy_certificates';

/**
 * Initialize certificates array in localStorage if it doesn't exist
 */
const initCertificates = () => {
  if (!localStorage.getItem(CERTIFICATES_KEY)) {
    localStorage.setItem(CERTIFICATES_KEY, JSON.stringify([]));
  }
};

/**
 * Get all certificates from localStorage
 */
export const getCertificates = () => {
  initCertificates();
  return JSON.parse(localStorage.getItem(CERTIFICATES_KEY));
};

/**
 * Save certificates to localStorage
 */
const saveCertificates = (certs) => {
  localStorage.setItem(CERTIFICATES_KEY, JSON.stringify(certs));
};

/**
 * Get all certificates generated for a specific student/client
 */
export const getCertificatesByClient = (clientId) => {
  const certs = getCertificates();
  return certs.filter(cert => cert.clientId === clientId);
};

/**
 * Get a specific certificate by its registry number
 */
export const getCertificateByRegistryNumber = (registryNumber) => {
  const certs = getCertificates();
  return certs.find(cert => cert.registryNumber === registryNumber);
};

export const generateCertificate = async (sale) => {
  try {
    if (window.electronAPI) {
      const response = await window.electronAPI.generateCertificate(sale.id);
      if (response.success) {
        return {
          success: true,
          registryNumber: response.registryNumber,
          pdfPath: response.pdfPath
        };
      } else {
        throw new Error(response.error || 'Error al generar certificado');
      }
    } else {
      throw new Error('Electron no está disponible');
    }
  } catch (error) {
    console.error('Error in generateCertificate:', error);
    throw error;
  }
};

export const downloadCertificatePdf = async (registryNumber) => {
  try {
    // Si estamos en electron local, el PDF ya está guardado localmente
    console.log(`El certificado ${registryNumber} se generó y guardó localmente.`);
  } catch (error) {
    console.error('Error opening certificate PDF:', error);
    throw error;
  }
};

export const calculateCertificateDates = (courseId, modality) => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return {
    issueDate: `${day}/${month}/${year}`,
    description: `realizado de forma ${modality || 'Virtual'}`
  };
};
