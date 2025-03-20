import React from 'react';

const ClaveUnicaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.4998 13.8956C12.9835 13.8956 13.3756 14.2878 13.3756 14.7715C13.3756 15.2552 12.9835 15.6473 12.4998 15.6473C12.0161 15.6473 11.6239 15.2552 11.6239 14.7715C11.6239 14.2878 12.0161 13.8956 12.4998 13.8956Z" fill="white" />
    <path fillRule="evenodd" clipRule="evenodd" d="M11.631 1.70078C11.631 1.21768 12.0227 0.82605 12.5058 0.82605H15.9585C16.4416 0.82605 16.8333 1.21768 16.8333 1.70078C16.8333 2.18387 16.4416 2.5755 15.9585 2.5755H13.3805V9.35701C15.9909 9.77835 17.9845 12.0421 17.9845 14.7714C17.9845 17.8006 15.5289 20.2562 12.4998 20.2562C9.47065 20.2562 7.01505 17.8006 7.01505 14.7714C7.01505 12.0379 9.01473 9.77145 11.631 9.35509V1.70078ZM8.7645 14.7714C8.7645 12.7085 10.4368 11.0361 12.4998 11.0361C14.5627 11.0361 16.2351 12.7085 16.2351 14.7714C16.2351 16.8344 14.5627 18.5067 12.4998 18.5067C10.4368 18.5067 8.7645 16.8344 8.7645 14.7714Z" fill="white" />
    <path d="M16.7507 5.65748C16.313 5.45302 15.7924 5.64209 15.5879 6.07979C15.3835 6.51748 15.5725 7.03806 16.0102 7.24252C18.8442 8.56635 20.8048 11.4409 20.8048 14.7716C20.8048 19.3583 17.0865 23.0766 12.4998 23.0766C7.91305 23.0766 4.19477 19.3583 4.19477 14.7716C4.19477 11.4517 6.14272 8.58499 8.96185 7.25542C9.39879 7.04935 9.58595 6.52809 9.37988 6.09115C9.17381 5.6542 8.65254 5.46705 8.2156 5.67312C4.80707 7.28066 2.44531 10.7494 2.44531 14.7716C2.44531 20.3245 6.94686 24.826 12.4998 24.826C18.0527 24.826 22.5543 20.3245 22.5543 14.7716C22.5543 10.7363 20.1771 7.25811 16.7507 5.65748Z" fill="white" />
  </svg>
);

const ClaveUnicaButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="btn-claveunica v-btn v-theme--light v-btn--density-default rounded-0 v-btn--size-large v-btn--variant-flat ml-2 my-2"
      style={{
        height: '56px',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 16px',
        backgroundColor: '#0072BB',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      aria-label="Iniciar sesión con ClaveÚnica"
    >
      <span className="v-btn__overlay" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        opacity: 0,
        transition: 'opacity 0.2s'
      }} />
      <span className="v-btn__underlay" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        opacity: 0,
        transition: 'opacity 0.2s'
      }} />
      <span className="v-btn__content" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <ClaveUnicaIcon />
        <span style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          Iniciar sesión
        </span>
      </span>
    </button>
  );
};

export default ClaveUnicaButton; 