// Traducciones para la aplicación
export type Language = 'es' | 'en' | 'pt'

export interface Translations {
  // Navegación
  nav: {
    home: string
    shop: string
    catalog: string
    about: string
    contact: string
    cart: string
    wishlist: string
    account: string
    admin: string
    dashboard: string
    orders: string
    products: string
    users: string
    stats: string
  }
  // Autenticación
  auth: {
    login: string
    signup: string
    logout: string
    email: string
    password: string
    forgotPassword: string
    resetPassword: string
    confirmPassword: string
    firstName: string
    lastName: string
    phone: string
    alreadyHaveAccount: string
    dontHaveAccount: string
    signIn: string
    signUp: string
    createAccount: string
  }
  // Wishlist
  wishlist: {
    title: string
    myFavorites: string
    empty: string
    emptyDescription: string
    exploreProducts: string
    itemsCount: string
    item: string
    items: string
    clearAll: string
    cleared: string
    removeFromFavorites: string
    addToFavorites: string
    inFavorites: string
    addedToCart: string
    removedFromFavorites: string
    add: string
    viewDetails: string
  }
  // Productos
  products: {
    title: string
    addToCart: string
    addToCartDescription: string
    addToWishlist: string
    removeFromWishlist: string
    outOfStock: string
    inStock: string
    price: string
    quantity: string
    description: string
    specifications: string
    reviews: string
    relatedProducts: string
    categories: string
    search: string
    searchPlaceholder: string
    noProductsFound: string
    filter: string
    sort: string
    sortBy: string
    sortOptions: {
      priceAsc: string
      priceDesc: string
      nameAsc: string
      nameDesc: string
      newest: string
      oldest: string
    }
  }
  // Carrito
  cart: {
    title: string
    empty: string
    emptyDescription: string
    subtotal: string
    shipping: string
    tax: string
    discount: string
    total: string
    checkout: string
    loading: string
    products: string
    itemsCount: string
    quantityLabel: string
    calculatedAtCheckout: string
    combo: string
    continueShopping: string
    remove: string
    update: string
    selectPaymentMethod: string
    selectPaymentMethodDescription: string
    purchaseProcessed: string
    purchaseProcessedDescription: string
    howToContinue: string
    chooseOptionToFinish: string
    continueAsGuest: string
    continueAsGuestDescription: string
    createAccountAndContinue: string
    createAccountAndContinueDescription: string
    alreadyHaveAccount: string
    loginHere: string
  }
  // Checkout
  checkout: {
    title: string
    shippingInfo: string
    paymentInfo: string
    orderSummary: string
    placeOrder: string
    processing: string
    address: string
    city: string
    postalCode: string
    country: string
    notes: string
    paymentMethod: string
  }
  // Pedidos
  orders: {
    title: string
    orderNumber: string
    date: string
    status: string
    total: string
    view: string
    download: string
    downloadExcel: string
    generatingExcel: string
    noOrders: string
    statusLabels: {
      pending: string
      confirmed: string
      processing: string
      shipped: string
      delivered: string
      cancelled: string
    }
    paymentStatus: {
      pending: string
      paid: string
      failed: string
      refunded: string
    }
  }
  // General
  common: {
    loading: string
    error: string
    success: string
    cancel: string
    save: string
    delete: string
    edit: string
    view: string
    close: string
    back: string
    next: string
    previous: string
    yes: string
    no: string
    confirm: string
    select: string
    all: string
    none: string
    search: string
    filter: string
    clear: string
    apply: string
    reset: string
  }
  // Footer
  footer: {
    navigation: string
    customerService: string
    ourCompany: string
    about: string
    terms: string
    contact: string
    sales: string
    help: string
    trackOrder: string
    shipping: string
    returns: string
    team: string
    stores: string
    marketing: string
    copyright: string
    shop: string
    catalog: string
    products: string
    information: string
    shippingAndDelivery: string
    customOrders: string
    faq: string
    madeWith: string
    electronicsBy: string
    allRightsReserved: string
  }
  // Contacto
  contact: {
    title: string
    contactUs: string
    close: string
    whatsapp: string
    chatbot: string
  }
  // Admin
  admin: {
    editMode: string
    exitEditMode: string
    editComponent: string
    saveChanges: string
    cancel: string
    pageEditor: string
    administration: string
    changeTheme: string
    changeFont: string
  }
  // Header & Menu
    header: {
      menu: string
      offers: string
      loadingCategories: string
      welcome: string
      welcomeAdmin: string
      search: string
      searchPlaceholder: string
      searchResults: string
      noProductsFound: string
      viewAllResults: string
    showPassword: string
    hidePassword: string
    loginRequired: string
    loginRequiredDescription: string
    loginRequiredDescription2: string
    forgotPasswordTitle: string
    forgotPasswordDescription: string
    forgotPasswordDescription2: string
    emailSent: string
    checkEmail: string
    backToLogin: string
    sendToAnotherEmail: string
    recoverPassword: string
    enterEmail: string
    passwordResetSent: string
    checkEmailForReset: string
    passwordsDoNotMatch: string
    passwordsDoNotMatchDescription: string
    incompleteFields: string
    incompleteFieldsDescription: string
    accountCreated: string
    welcomeAdminMessage: string
    accountCreatedSuccess: string
    confirmEmailSent: string
    confirmEmailDescription: string
    passwordMinLength: string
    errorCreatingAccount: string
    sessionStarted: string
    welcomeAdminLogin: string
    errorLoggingIn: string
    sessionClosed: string
    sessionClosedDescription: string
    productRemoved: string
    productRemovedDescription: string
    confirmPayment: string
  }
}

export const translations: Record<Language, Translations> = {
  es: {
    nav: {
      home: 'Inicio',
      shop: 'Tienda',
      catalog: 'Catálogo',
      about: 'Acerca de',
      contact: 'Contacto',
      cart: 'Carrito',
      wishlist: 'Lista de deseos',
      account: 'Cuenta',
      admin: 'Administrador',
      dashboard: 'Panel',
      orders: 'Pedidos',
      products: 'Productos',
      users: 'Usuarios',
      stats: 'Estadísticas',
    },
    auth: {
      login: 'Iniciar sesión',
      signup: 'Registrarse',
      logout: 'Cerrar sesión',
      email: 'Correo electrónico',
      password: 'Contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      resetPassword: 'Restablecer contraseña',
      confirmPassword: 'Confirmar contraseña',
      firstName: 'Nombre',
      lastName: 'Apellido',
      phone: 'Teléfono',
      alreadyHaveAccount: '¿Ya tienes una cuenta?',
      dontHaveAccount: '¿No tienes una cuenta?',
      signIn: 'Iniciar sesión',
      signUp: 'Registrarse',
      createAccount: 'Crear cuenta',
    },
    products: {
      title: 'Productos',
      addToCart: 'Agregar al carrito',
      addToCartDescription: '{quantity} {unit} de {name} {verb} agregada{plural} exitosamente',
      addToWishlist: 'Agregar a lista de deseos',
      removeFromWishlist: 'Quitar de lista de deseos',
      outOfStock: 'Agotado',
      inStock: 'Disponible',
      price: 'Precio',
      quantity: 'Cantidad',
      description: 'Descripción',
      specifications: 'Especificaciones',
      reviews: 'Reseñas',
      relatedProducts: 'Productos relacionados',
      categories: 'Categorías',
      search: 'Buscar',
      searchPlaceholder: 'Buscar productos...',
      noProductsFound: 'No se encontraron productos',
      filter: 'Filtrar',
      sort: 'Ordenar',
      sortBy: 'Ordenar por',
      sortOptions: {
        priceAsc: 'Precio: menor a mayor',
        priceDesc: 'Precio: mayor a menor',
        nameAsc: 'Nombre: A-Z',
        nameDesc: 'Nombre: Z-A',
        newest: 'Más recientes',
        oldest: 'Más antiguos',
      },
    },
    wishlist: {
      title: 'Lista de deseos',
      myFavorites: 'Mis Favoritos',
      empty: 'Tu lista de favoritos está vacía',
      emptyDescription: 'Agrega productos a tus favoritos para encontrarlos fácilmente más tarde',
      exploreProducts: 'Explorar productos',
      itemsCount: 'productos en tu lista',
      item: 'producto',
      items: 'productos',
      clearAll: 'Limpiar todo',
      cleared: 'Lista de favoritos vaciada',
      removeFromFavorites: 'Eliminar de favoritos',
      addToFavorites: 'Agregar a favoritos',
      inFavorites: 'En favoritos',
      addedToCart: 'Producto agregado al carrito',
      removedFromFavorites: 'Producto eliminado de favoritos',
      add: 'Agregar',
      viewDetails: 'Ver detalles',
    },
    cart: {
      title: 'Carrito de compras',
      empty: 'Tu carrito está vacío',
      emptyDescription: 'Agrega productos a tu carrito para comenzar',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      tax: 'Impuestos',
      discount: 'Descuento',
      total: 'Total',
      checkout: 'Finalizar compra',
      loading: 'Cargando carrito...',
      products: 'Productos',
      itemsCount: '{count} artículos',
      quantityLabel: 'Cantidad',
      calculatedAtCheckout: 'Calculado al finalizar',
      combo: 'combo',
      continueShopping: 'Continuar comprando',
      remove: 'Eliminar',
      update: 'Actualizar',
      selectPaymentMethod: 'Selecciona un medio de pago',
      selectPaymentMethodDescription: 'Por favor, elige cómo deseas pagar',
      purchaseProcessed: 'Compra procesada',
      purchaseProcessedDescription: 'Tu pedido ha sido procesado exitosamente con {method}',
      howToContinue: '¿Cómo deseas continuar?',
      chooseOptionToFinish: 'Elige una opción para finalizar tu compra',
      continueAsGuest: 'Continuar como Invitado',
      continueAsGuestDescription: 'Completa tu compra sin crear una cuenta. Podrás crear una cuenta más tarde si lo deseas.',
      createAccountAndContinue: 'Crear Cuenta y Continuar',
      createAccountAndContinueDescription: 'Crea una cuenta gratuita para guardar tus pedidos, recibir ofertas exclusivas y más.',
      alreadyHaveAccount: '¿Ya tienes una cuenta?',
      loginHere: 'Inicia sesión aquí',
    },
    checkout: {
      title: 'Finalizar compra',
      shippingInfo: 'Información de envío',
      paymentInfo: 'Información de pago',
      orderSummary: 'Resumen del pedido',
      placeOrder: 'Realizar pedido',
      processing: 'Procesando...',
      address: 'Dirección',
      city: 'Ciudad',
      postalCode: 'Código postal',
      country: 'País',
      notes: 'Notas',
      paymentMethod: 'Método de pago',
    },
    orders: {
      title: 'Pedidos',
      orderNumber: 'Número de pedido',
      date: 'Fecha',
      status: 'Estado',
      total: 'Total',
      view: 'Ver',
      download: 'Descargar',
      downloadExcel: 'Descargar Excel',
      generatingExcel: 'Generando Excel...',
      noOrders: 'No hay pedidos',
      statusLabels: {
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        processing: 'Procesando',
        shipped: 'Enviado',
        delivered: 'Entregado',
        cancelled: 'Cancelado',
      },
      paymentStatus: {
        pending: 'Pendiente',
        paid: 'Pagado',
        failed: 'Fallido',
        refunded: 'Reembolsado',
      },
    },
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      view: 'Ver',
      close: 'Cerrar',
      back: 'Atrás',
      next: 'Siguiente',
      previous: 'Anterior',
      yes: 'Sí',
      no: 'No',
      confirm: 'Confirmar',
      select: 'Seleccionar',
      all: 'Todos',
      none: 'Ninguno',
      search: 'Buscar',
      filter: 'Filtrar',
      clear: 'Limpiar',
      apply: 'Aplicar',
      reset: 'Restablecer',
    },
    footer: {
      navigation: 'Navegación',
      customerService: 'Servicio al cliente',
      ourCompany: 'Nuestra Empresa',
      about: 'Acerca de',
      terms: 'Términos y Condiciones',
      contact: 'Contacto',
      sales: 'Ventas',
      help: 'Ayuda y Preguntas Frecuentes',
      trackOrder: 'Rastrear Pedido',
      shipping: 'Envío y Entrega',
      returns: 'Entrega y Devoluciones',
      team: 'Nuestro equipo',
      stores: 'Tiendas Físicas',
      marketing: 'Cooperación de Marketing',
      copyright: 'Todos los Derechos Reservados',
      shop: 'Tienda',
      catalog: 'Catálogo',
      products: 'Productos',
      information: 'Información',
      shippingAndDelivery: 'Envíos y Entrega',
      customOrders: 'Pedidos Personalizados',
      faq: 'Preguntas Frecuentes',
      madeWith: 'Hecho con ❤️ y mucho azúcar',
      electronicsBy: 'Electrónica por Muffin group',
      allRightsReserved: 'Todos los Derechos Reservados',
    },
    contact: {
      title: 'Contáctanos',
      contactUs: 'Contáctanos',
      close: 'Cerrar',
      whatsapp: 'WhatsApp',
      chatbot: 'Chatbot',
    },
    admin: {
      editMode: 'Modo Edición',
      exitEditMode: 'Salir de Edición',
      editComponent: 'Editar componente',
      saveChanges: 'Guardar cambios',
      cancel: 'Cancelar',
      pageEditor: 'Editor de Página',
      administration: 'Administración',
      changeTheme: 'Cambiar tema',
      changeFont: 'Cambiar fuente',
    },
    header: {
      menu: 'Menú',
      offers: 'Ofertas',
      loadingCategories: 'Cargando categorías...',
      welcome: 'Hola {name}, bienvenido a la aplicación',
      welcomeAdmin: 'Hola Administrador, bienvenido a la aplicación',
      search: 'Buscar',
      searchPlaceholder: 'Buscar...',
      searchResults: 'Resultados de búsqueda',
      noProductsFound: 'No se encontraron productos',
      viewAllResults: 'Ver todos los resultados para "{query}"',
      showPassword: 'Mostrar contraseña',
      hidePassword: 'Ocultar contraseña',
      loginRequired: 'Iniciar sesión requerido',
      loginRequiredDescription: 'Para continuar con tu compra, necesitas iniciar sesión en tu cuenta.',
      loginRequiredDescription2: 'Si no tienes una cuenta, puedes crear una fácilmente.',
      forgotPasswordTitle: 'Recuperar Contraseña',
      forgotPasswordDescription: 'Ingresa tu correo electrónico y te enviaremos un link para restablecer tu contraseña',
      forgotPasswordDescription2: 'Revisa tu correo electrónico para restablecer tu contraseña',
      emailSent: 'Email Enviado',
      checkEmail: 'Revisa tu correo para restablecer tu contraseña',
      backToLogin: 'Volver a iniciar sesión',
      sendToAnotherEmail: 'Enviar a otro correo',
      recoverPassword: 'Recuperar Contraseña',
      enterEmail: 'Correo electrónico',
      passwordResetSent: 'Correo enviado',
      checkEmailForReset: 'Revisa tu correo para restablecer tu contraseña',
      passwordsDoNotMatch: 'Las contraseñas no coinciden',
      passwordsDoNotMatchDescription: 'Por favor, verifica que ambas contraseñas sean iguales',
      incompleteFields: 'Campos incompletos',
      incompleteFieldsDescription: 'Por favor, completa todos los campos',
      accountCreated: 'Cuenta creada',
      welcomeAdminMessage: 'Bienvenido, Administrador!',
      accountCreatedSuccess: 'Tu cuenta ha sido creada exitosamente',
      confirmEmailSent: 'Revisa tu correo',
      confirmEmailDescription: 'Te hemos enviado un enlace para confirmar tu cuenta. Haz clic en el enlace del correo para activar tu cuenta e iniciar sesión.',
      passwordMinLength: 'La contraseña debe tener al menos 6 caracteres',
      errorCreatingAccount: 'Error al crear cuenta',
      sessionStarted: 'Sesión iniciada',
      welcomeAdminLogin: 'Bienvenido, Administrador!',
      errorLoggingIn: 'Error al iniciar sesión',
      sessionClosed: 'Sesión cerrada',
      sessionClosedDescription: 'Has cerrado sesión exitosamente',
      productRemoved: 'Producto eliminado',
      productRemovedDescription: '{name} ha sido eliminado del carrito',
      confirmPayment: 'Confirmar Pago',
    },
  },
  en: {
    nav: {
      home: 'Home',
      shop: 'Shop',
      catalog: 'Catalog',
      about: 'About',
      contact: 'Contact',
      cart: 'Cart',
      wishlist: 'Wishlist',
      account: 'Account',
      admin: 'Admin',
      dashboard: 'Dashboard',
      orders: 'Orders',
      products: 'Products',
      users: 'Users',
      stats: 'Statistics',
    },
    auth: {
      login: 'Login',
      signup: 'Sign up',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot your password?',
      resetPassword: 'Reset password',
      confirmPassword: 'Confirm password',
      firstName: 'First name',
      lastName: 'Last name',
      phone: 'Phone',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      signIn: 'Sign in',
      signUp: 'Sign up',
      createAccount: 'Create account',
    },
    products: {
      title: 'Products',
      addToCart: 'Add to cart',
      addToCartDescription: '{quantity} {unit} of {name} {verb} added successfully',
      addToWishlist: 'Add to wishlist',
      removeFromWishlist: 'Remove from wishlist',
      outOfStock: 'Out of stock',
      inStock: 'In stock',
      price: 'Price',
      quantity: 'Quantity',
      description: 'Description',
      specifications: 'Specifications',
      reviews: 'Reviews',
      relatedProducts: 'Related products',
      categories: 'Categories',
      search: 'Search',
      searchPlaceholder: 'Search products...',
      noProductsFound: 'No products found',
      filter: 'Filter',
      sort: 'Sort',
      sortBy: 'Sort by',
      sortOptions: {
        priceAsc: 'Price: low to high',
        priceDesc: 'Price: high to low',
        nameAsc: 'Name: A-Z',
        nameDesc: 'Name: Z-A',
        newest: 'Newest',
        oldest: 'Oldest',
      },
    },
    wishlist: {
      title: 'Wishlist',
      myFavorites: 'My Favorites',
      empty: 'Your favorites list is empty',
      emptyDescription: 'Add products to your favorites to find them easily later',
      exploreProducts: 'Explore products',
      itemsCount: 'products in your list',
      item: 'product',
      items: 'products',
      clearAll: 'Clear all',
      cleared: 'Favorites list cleared',
      removeFromFavorites: 'Remove from favorites',
      addToFavorites: 'Add to favorites',
      inFavorites: 'In favorites',
      addedToCart: 'Product added to cart',
      removedFromFavorites: 'Product removed from favorites',
      add: 'Add',
      viewDetails: 'View details',
    },
    cart: {
      title: 'Shopping cart',
      empty: 'Your cart is empty',
      emptyDescription: 'Add products to your cart to get started',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      discount: 'Discount',
      total: 'Total',
      checkout: 'Checkout',
      loading: 'Loading cart...',
      products: 'Products',
      itemsCount: '{count} items',
      quantityLabel: 'Quantity',
      calculatedAtCheckout: 'Calculated at checkout',
      combo: 'combo',
      continueShopping: 'Continue shopping',
      remove: 'Remove',
      update: 'Update',
      selectPaymentMethod: 'Select a payment method',
      selectPaymentMethodDescription: 'Please choose how you want to pay',
      purchaseProcessed: 'Purchase processed',
      purchaseProcessedDescription: 'Your order has been successfully processed with {method}',
      howToContinue: 'How would you like to continue?',
      chooseOptionToFinish: 'Choose an option to complete your purchase',
      continueAsGuest: 'Continue as Guest',
      continueAsGuestDescription: 'Complete your purchase without creating an account. You can create an account later if you wish.',
      createAccountAndContinue: 'Create Account and Continue',
      createAccountAndContinueDescription: 'Create a free account to save your orders, receive exclusive offers and more.',
      alreadyHaveAccount: 'Already have an account?',
      loginHere: 'Log in here',
    },
    checkout: {
      title: 'Checkout',
      shippingInfo: 'Shipping information',
      paymentInfo: 'Payment information',
      orderSummary: 'Order summary',
      placeOrder: 'Place order',
      processing: 'Processing...',
      address: 'Address',
      city: 'City',
      postalCode: 'Postal code',
      country: 'Country',
      notes: 'Notes',
      paymentMethod: 'Payment method',
    },
    orders: {
      title: 'Orders',
      orderNumber: 'Order number',
      date: 'Date',
      status: 'Status',
      total: 'Total',
      view: 'View',
      download: 'Download',
      downloadExcel: 'Download Excel',
      generatingExcel: 'Generating Excel...',
      noOrders: 'No orders',
      statusLabels: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
      },
      paymentStatus: {
        pending: 'Pending',
        paid: 'Paid',
        failed: 'Failed',
        refunded: 'Refunded',
      },
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      yes: 'Yes',
      no: 'No',
      confirm: 'Confirm',
      select: 'Select',
      all: 'All',
      none: 'None',
      search: 'Search',
      filter: 'Filter',
      clear: 'Clear',
      apply: 'Apply',
      reset: 'Reset',
    },
    footer: {
      navigation: 'Navigation',
      customerService: 'Customer Service',
      ourCompany: 'Our Company',
      about: 'About',
      terms: 'Terms and Conditions',
      contact: 'Contact',
      sales: 'Sales',
      help: 'Help and FAQ',
      trackOrder: 'Track Order',
      shipping: 'Shipping and Delivery',
      returns: 'Returns and Refunds',
      team: 'Our team',
      stores: 'Physical Stores',
      marketing: 'Marketing Cooperation',
      copyright: 'All Rights Reserved',
      shop: 'Shop',
      catalog: 'Catalog',
      products: 'Products',
      information: 'Information',
      shippingAndDelivery: 'Shipping and Delivery',
      customOrders: 'Custom Orders',
      faq: 'FAQ',
      madeWith: 'Made with ❤️ and lots of sugar',
      electronicsBy: 'Electronics by Muffin group',
      allRightsReserved: 'All Rights Reserved',
    },
    contact: {
      title: 'Contact us',
      contactUs: 'Contact us',
      close: 'Close',
      whatsapp: 'WhatsApp',
      chatbot: 'Chatbot',
    },
    admin: {
      editMode: 'Edit Mode',
      exitEditMode: 'Exit Edit Mode',
      editComponent: 'Edit component',
      saveChanges: 'Save changes',
      cancel: 'Cancel',
      pageEditor: 'Page Editor',
      administration: 'Administration',
      changeTheme: 'Change theme',
      changeFont: 'Change font',
    },
    header: {
      menu: 'Menu',
      offers: 'Offers',
      loadingCategories: 'Loading categories...',
      welcome: 'Hello {name}, welcome to the application',
      welcomeAdmin: 'Hello Administrator, welcome to the application',
      search: 'Search',
      searchPlaceholder: 'Search...',
      searchResults: 'Search results',
      noProductsFound: 'No products found',
      viewAllResults: 'View all results for "{query}"',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      loginRequired: 'Login required',
      loginRequiredDescription: 'To continue with your purchase, you need to log in to your account.',
      loginRequiredDescription2: "If you don't have an account, you can easily create one.",
      forgotPasswordTitle: 'Recover Password',
      forgotPasswordDescription: 'Enter your email address and we will send you a link to reset your password',
      forgotPasswordDescription2: 'Check your email to reset your password',
      emailSent: 'Email Sent',
      checkEmail: 'Check your email to reset your password',
      backToLogin: 'Back to login',
      sendToAnotherEmail: 'Send to another email',
      recoverPassword: 'Recover Password',
      enterEmail: 'Email',
      passwordResetSent: 'Email sent',
      checkEmailForReset: 'Check your email to reset your password',
      passwordsDoNotMatch: 'Passwords do not match',
      passwordsDoNotMatchDescription: 'Please verify that both passwords are the same',
      incompleteFields: 'Incomplete fields',
      incompleteFieldsDescription: 'Please complete all fields',
      accountCreated: 'Account created',
      welcomeAdminMessage: 'Welcome, Administrator!',
      accountCreatedSuccess: 'Your account has been created successfully',
      confirmEmailSent: 'Check your email',
      confirmEmailDescription: 'We sent you a link to confirm your account. Click the link in the email to activate your account and sign in.',
      passwordMinLength: 'Password must be at least 6 characters',
      errorCreatingAccount: 'Error creating account',
      sessionStarted: 'Session started',
      welcomeAdminLogin: 'Welcome, Administrator!',
      errorLoggingIn: 'Error logging in',
      sessionClosed: 'Session closed',
      sessionClosedDescription: 'You have successfully logged out',
      productRemoved: 'Product removed',
      productRemovedDescription: '{name} has been removed from cart',
      confirmPayment: 'Confirm Payment',
    },
  },
  pt: {
    nav: {
      home: 'Início',
      shop: 'Loja',
      catalog: 'Catálogo',
      about: 'Sobre',
      contact: 'Contato',
      cart: 'Carrinho',
      wishlist: 'Lista de desejos',
      account: 'Conta',
      admin: 'Administrador',
      dashboard: 'Painel',
      orders: 'Pedidos',
      products: 'Produtos',
      users: 'Usuários',
      stats: 'Estatísticas',
    },
    auth: {
      login: 'Entrar',
      signup: 'Cadastrar',
      logout: 'Sair',
      email: 'E-mail',
      password: 'Senha',
      forgotPassword: 'Esqueceu sua senha?',
      resetPassword: 'Redefinir senha',
      confirmPassword: 'Confirmar senha',
      firstName: 'Nome',
      lastName: 'Sobrenome',
      phone: 'Telefone',
      alreadyHaveAccount: 'Já tem uma conta?',
      dontHaveAccount: 'Não tem uma conta?',
      signIn: 'Entrar',
      signUp: 'Cadastrar',
      createAccount: 'Criar conta',
    },
    products: {
      title: 'Produtos',
      addToCart: 'Adicionar ao carrinho',
      addToCartDescription: '{quantity} {unit} de {name} {verb} adicionada{plural} com sucesso',
      addToWishlist: 'Adicionar à lista de desejos',
      removeFromWishlist: 'Remover da lista de desejos',
      outOfStock: 'Esgotado',
      inStock: 'Disponível',
      price: 'Preço',
      quantity: 'Quantidade',
      description: 'Descrição',
      specifications: 'Especificações',
      reviews: 'Avaliações',
      relatedProducts: 'Produtos relacionados',
      categories: 'Categorias',
      search: 'Buscar',
      searchPlaceholder: 'Buscar produtos...',
      noProductsFound: 'Nenhum produto encontrado',
      filter: 'Filtrar',
      sort: 'Ordenar',
      sortBy: 'Ordenar por',
      sortOptions: {
        priceAsc: 'Preço: menor para maior',
        priceDesc: 'Preço: maior para menor',
        nameAsc: 'Nome: A-Z',
        nameDesc: 'Nome: Z-A',
        newest: 'Mais recentes',
        oldest: 'Mais antigos',
      },
    },
    wishlist: {
      title: 'Lista de desejos',
      myFavorites: 'Meus Favoritos',
      empty: 'Sua lista de favoritos está vazia',
      emptyDescription: 'Adicione produtos aos seus favoritos para encontrá-los facilmente depois',
      exploreProducts: 'Explorar produtos',
      itemsCount: 'produtos na sua lista',
      item: 'produto',
      items: 'produtos',
      clearAll: 'Limpar tudo',
      cleared: 'Lista de favoritos limpa',
      removeFromFavorites: 'Remover dos favoritos',
      addToFavorites: 'Adicionar aos favoritos',
      inFavorites: 'Nos favoritos',
      addedToCart: 'Produto adicionado ao carrinho',
      removedFromFavorites: 'Produto removido dos favoritos',
      add: 'Adicionar',
      viewDetails: 'Ver detalhes',
    },
    cart: {
      title: 'Carrinho de compras',
      empty: 'Seu carrinho está vazio',
      emptyDescription: 'Adicione produtos ao seu carrinho para começar',
      subtotal: 'Subtotal',
      shipping: 'Frete',
      tax: 'Impostos',
      discount: 'Desconto',
      total: 'Total',
      checkout: 'Finalizar compra',
      loading: 'Carregando carrinho...',
      products: 'Produtos',
      itemsCount: '{count} itens',
      quantityLabel: 'Quantidade',
      calculatedAtCheckout: 'Calculado ao finalizar',
      combo: 'combo',
      continueShopping: 'Continuar comprando',
      remove: 'Remover',
      update: 'Atualizar',
      selectPaymentMethod: 'Selecione um método de pagamento',
      selectPaymentMethodDescription: 'Por favor, escolha como deseja pagar',
      purchaseProcessed: 'Compra processada',
      purchaseProcessedDescription: 'Seu pedido foi processado com sucesso com {method}',
      howToContinue: 'Como deseja continuar?',
      chooseOptionToFinish: 'Escolha uma opção para finalizar sua compra',
      continueAsGuest: 'Continuar como Convidado',
      continueAsGuestDescription: 'Complete sua compra sem criar uma conta. Você pode criar uma conta mais tarde se desejar.',
      createAccountAndContinue: 'Criar Conta e Continuar',
      createAccountAndContinueDescription: 'Crie uma conta gratuita para salvar seus pedidos, receber ofertas exclusivas e mais.',
      alreadyHaveAccount: 'Já tem uma conta?',
      loginHere: 'Faça login aqui',
    },
    checkout: {
      title: 'Finalizar compra',
      shippingInfo: 'Informações de entrega',
      paymentInfo: 'Informações de pagamento',
      orderSummary: 'Resumo do pedido',
      placeOrder: 'Fazer pedido',
      processing: 'Processando...',
      address: 'Endereço',
      city: 'Cidade',
      postalCode: 'CEP',
      country: 'País',
      notes: 'Observações',
      paymentMethod: 'Método de pagamento',
    },
    orders: {
      title: 'Pedidos',
      orderNumber: 'Número do pedido',
      date: 'Data',
      status: 'Status',
      total: 'Total',
      view: 'Ver',
      download: 'Baixar',
      downloadExcel: 'Baixar Excel',
      generatingExcel: 'Gerando Excel...',
      noOrders: 'Nenhum pedido',
      statusLabels: {
        pending: 'Pendente',
        confirmed: 'Confirmado',
        processing: 'Processando',
        shipped: 'Enviado',
        delivered: 'Entregue',
        cancelled: 'Cancelado',
      },
      paymentStatus: {
        pending: 'Pendente',
        paid: 'Pago',
        failed: 'Falhou',
        refunded: 'Reembolsado',
      },
    },
    common: {
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      cancel: 'Cancelar',
      save: 'Salvar',
      delete: 'Excluir',
      edit: 'Editar',
      view: 'Ver',
      close: 'Fechar',
      back: 'Voltar',
      next: 'Próximo',
      previous: 'Anterior',
      yes: 'Sim',
      no: 'Não',
      confirm: 'Confirmar',
      select: 'Selecionar',
      all: 'Todos',
      none: 'Nenhum',
      search: 'Buscar',
      filter: 'Filtrar',
      clear: 'Limpar',
      apply: 'Aplicar',
      reset: 'Redefinir',
    },
    footer: {
      navigation: 'Navegação',
      customerService: 'Atendimento ao Cliente',
      ourCompany: 'Nossa Empresa',
      about: 'Sobre',
      terms: 'Termos e Condições',
      contact: 'Contato',
      sales: 'Vendas',
      help: 'Ajuda e Perguntas Frequentes',
      trackOrder: 'Rastrear Pedido',
      shipping: 'Envio e Entrega',
      returns: 'Devoluções e Reembolsos',
      team: 'Nosso time',
      stores: 'Lojas Físicas',
      marketing: 'Cooperação de Marketing',
      copyright: 'Todos os Direitos Reservados',
      shop: 'Loja',
      catalog: 'Catálogo',
      products: 'Produtos',
      information: 'Informação',
      shippingAndDelivery: 'Envios e Entrega',
      customOrders: 'Pedidos Personalizados',
      faq: 'Perguntas Frequentes',
      madeWith: 'Feito com ❤️ e muito açúcar',
      electronicsBy: 'Eletrônica por Muffin group',
      allRightsReserved: 'Todos os Direitos Reservados',
    },
    contact: {
      title: 'Entre em contato',
      contactUs: 'Entre em contato',
      close: 'Fechar',
      whatsapp: 'WhatsApp',
      chatbot: 'Chatbot',
    },
    admin: {
      editMode: 'Modo de Edição',
      exitEditMode: 'Sair do Modo de Edição',
      editComponent: 'Editar componente',
      saveChanges: 'Salvar alterações',
      cancel: 'Cancelar',
      pageEditor: 'Editor de Página',
      administration: 'Administração',
      changeTheme: 'Mudar tema',
      changeFont: 'Mudar fonte',
    },
    header: {
      menu: 'Menu',
      offers: 'Ofertas',
      loadingCategories: 'Carregando categorias...',
      welcome: 'Olá {name}, bem-vindo ao aplicativo',
      welcomeAdmin: 'Olá Administrador, bem-vindo ao aplicativo',
      search: 'Buscar',
      searchPlaceholder: 'Buscar...',
      searchResults: 'Resultados da busca',
      noProductsFound: 'Nenhum produto encontrado',
      viewAllResults: 'Ver todos os resultados para "{query}"',
      showPassword: 'Mostrar senha',
      hidePassword: 'Ocultar senha',
      loginRequired: 'Login necessário',
      loginRequiredDescription: 'Para continuar com sua compra, você precisa fazer login em sua conta.',
      loginRequiredDescription2: 'Se você não tem uma conta, pode criar uma facilmente.',
      forgotPasswordTitle: 'Recuperar Senha',
      forgotPasswordDescription: 'Digite seu endereço de e-mail e enviaremos um link para redefinir sua senha',
      forgotPasswordDescription2: 'Verifique seu e-mail para redefinir sua senha',
      emailSent: 'E-mail Enviado',
      checkEmail: 'Verifique seu e-mail para redefinir sua senha',
      backToLogin: 'Voltar ao login',
      sendToAnotherEmail: 'Enviar para outro e-mail',
      recoverPassword: 'Recuperar Senha',
      enterEmail: 'E-mail',
      passwordResetSent: 'E-mail enviado',
      checkEmailForReset: 'Verifique seu e-mail para redefinir sua senha',
      passwordsDoNotMatch: 'As senhas não coincidem',
      passwordsDoNotMatchDescription: 'Por favor, verifique se ambas as senhas são iguais',
      incompleteFields: 'Campos incompletos',
      incompleteFieldsDescription: 'Por favor, preencha todos os campos',
      accountCreated: 'Conta criada',
      welcomeAdminMessage: 'Bem-vindo, Administrador!',
      accountCreatedSuccess: 'Sua conta foi criada com sucesso',
      confirmEmailSent: 'Verifique seu e-mail',
      confirmEmailDescription: 'Enviamos um link para confirmar sua conta. Clique no link do e-mail para ativar sua conta e entrar.',
      passwordMinLength: 'A senha deve ter pelo menos 6 caracteres',
      errorCreatingAccount: 'Erro ao criar conta',
      sessionStarted: 'Sessão iniciada',
      welcomeAdminLogin: 'Bem-vindo, Administrador!',
      errorLoggingIn: 'Erro ao fazer login',
      sessionClosed: 'Sessão encerrada',
      sessionClosedDescription: 'Você saiu com sucesso',
      productRemoved: 'Produto removido',
      productRemovedDescription: '{name} foi removido do carrinho',
      confirmPayment: 'Confirmar Pagamento',
    },
  },
}

