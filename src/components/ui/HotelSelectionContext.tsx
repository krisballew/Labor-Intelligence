import React, { createContext, useContext } from 'react';

interface HotelSelectionContextValue {
  selectHotel: (hotelId: string) => void;
}

const HotelSelectionContext = createContext<HotelSelectionContextValue | null>(null);

export const HotelSelectionProvider: React.FC<{
  selectHotel: (hotelId: string) => void;
  children: React.ReactNode;
}> = ({ selectHotel, children }) => (
  <HotelSelectionContext.Provider value={{ selectHotel }}>
    {children}
  </HotelSelectionContext.Provider>
);

export const useSelectHotel = (): ((hotelId: string) => void) | null => {
  const ctx = useContext(HotelSelectionContext);
  return ctx?.selectHotel ?? null;
};

interface HotelLinkProps {
  hotelId: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
  stopPropagation?: boolean;
}

/**
 * Renders the hotel name as a button that focuses the dashboard on a single hotel
 * when a selectHotel handler is in context. Falls back to a plain span otherwise.
 */
export const HotelLink: React.FC<HotelLinkProps> = ({
  hotelId,
  className = '',
  children,
  title,
  stopPropagation = false,
}) => {
  const selectHotel = useSelectHotel();
  if (!selectHotel) {
    return <span className={className}>{children}</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        selectHotel(hotelId);
      }}
      title={title ?? 'Focus dashboard on this property'}
      className={`text-left hover:text-teal-dark hover:underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-2 focus:ring-teal rounded-sm cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
};
