"use client"

export function LoadingScreen() {
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500"
      style={{
        backgroundColor: "var(--background)",
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Spinner animado */}
        <div className="relative">
          <div 
            className="h-16 w-16 md:h-20 md:w-20 border-4 rounded-full animate-spin"
            style={{
              borderColor: "var(--primary) transparent var(--primary) transparent",
              borderWidth: "4px",
              opacity: 0.2,
            }}
          />
          <div 
            className="absolute inset-0 border-4 rounded-full animate-spin"
            style={{
              borderColor: "transparent transparent var(--primary) transparent",
              borderWidth: "4px",
              animationDirection: "reverse",
              animationDuration: "0.8s",
            }}
          />
          <div 
            className="absolute inset-2 flex items-center justify-center"
            style={{
              backgroundColor: "var(--primary)",
              opacity: 0.1,
              borderRadius: "50%",
            }}
          />
        </div>
        
        {/* Texto de carga */}
        <div className="text-center space-y-2">
          <p 
            className="text-sm md:text-base font-medium"
            style={{
              color: "var(--foreground)",
              opacity: 0.8,
            }}
          >
            Cargando...
          </p>
          <div className="flex items-center justify-center space-x-1.5">
            <div 
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: "var(--primary)",
                animationDelay: "0ms",
                animationDuration: "1.4s",
              }}
            />
            <div 
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: "var(--primary)",
                animationDelay: "200ms",
                animationDuration: "1.4s",
              }}
            />
            <div 
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: "var(--primary)",
                animationDelay: "400ms",
                animationDuration: "1.4s",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

