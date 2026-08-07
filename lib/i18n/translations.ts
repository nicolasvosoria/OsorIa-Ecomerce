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
    weightSectionTitle: string
    weightSectionDescription: string
    weightLabel: string
    weightRequiredError: string
    weightPublicLabel: string
  }
  // Carrito
  cart: {
    title: string
    empty: string
    emptyDescription: string
    subtotal: string
    shipping: string
    shippingCalculatedAtCheckout: string
    discount: string
    total: string
    checkout: string
    loading: string
    products: string
    itemsCount: string
    quantityLabel: string
    combo: string
    continueShopping: string
    remove: string
    update: string
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
    // D28: los dos selects encadenados del picker de destino (departamento,
    // luego municipio filtrado a ese departamento).
    department: string
    selectDepartment: string
    municipality: string
    selectMunicipality: string
    selectDepartmentFirst: string
    postalCode: string
    country: string
    notes: string
    paymentMethod: string
    shippingConfirmedByStore: string
    guestLoginCta: string
    unitPrice: string
    // D14/D11: coordination copy naming the store and its real WhatsApp contact
    shippingCoordinationContact: string
    shippingCoordinationCta: string
    // D23: the live shipping quote's vocabulary -- one word per resolution
    // status/transitional state, never a back-computed number standing in
    // for a word. shippingFree/shippingOutOfZone plug into
    // lib/shipping/status-display.ts, the shared mapping a later order
    // detail screen reuses so the two surfaces can't drift.
    shippingFree: string
    shippingOutOfZone: string
    shippingBlocked: string
    shippingQuoteFailed: string
    shippingCalculating: string
    shippingSelectDestination: string
    totalPendingShipping: string
  }
  // Envío: configuración del modo de envío de la tienda (D31)
  shipping: {
    settingsTitle: string
    settingsSubtitle: string
    modeLabel: string
    modeCoordinate: string
    modeOwnRates: string
    saveButton: string
    saving: string
    savedToast: string
    saveErrorToast: string
    summaryTitle: string
    summaryModeLabel: string
    summaryConfigureLink: string
    // D14/F10: the coordinate mode's WhatsApp phone prerequisite, marked pending
    contactPhonePendingTitle: string
    contactPhonePendingDescription: string
    contactPhonePendingCta: string
    // A9: a saved phone that can't build a valid WhatsApp link (wrong digit count, etc.)
    contactPhoneInvalidTitle: string
    contactPhoneInvalidDescription: string
    contactPhoneInvalidCta: string
    // D3/D5/D6/D8/D10: zonas de envío, sus destinos y su escalera de tarifas (S7).
    zones: {
      sectionTitle: string
      sectionDescription: string
      addButton: string
      createTitle: string
      editTitle: string
      emptyTitle: string
      emptyDescription: string
      nameLabel: string
      namePlaceholder: string
      destinationsLabel: string
      departmentPlaceholder: string
      addWholeDepartmentButton: string
      addMunicipalityButton: string
      municipalitySearchPlaceholder: string
      loadingMunicipalities: string
      noMunicipalitiesFound: string
      wholeDepartmentPrefix: string
      removeDestinationLabel: string
      destinationsColumn: string
      basisColumn: string
      actionsColumn: string
      basisLabel: string
      basisFlat: string
      basisOrderValue: string
      basisWeight: string
      flatAmountLabel: string
      rangesLabel: string
      rangeFromLabel: string
      rangeToLabel: string
      rangeToPlaceholder: string
      rangeAmountLabel: string
      addRangeButton: string
      removeRangeLabel: string
      codCommissionNote: string
      missingWeightTitle: string
      missingWeightDescription: string
      viewProductLink: string
      saveButton: string
      saving: string
      cancelButton: string
      savedToast: string
      saveErrorToast: string
      deleteTitle: string
      deleteDescription: string
      deleteConfirmButton: string
      deletedToast: string
      deleteErrorToast: string
      unmatchedDestinationTitle: string
      unmatchedDestinationDescription: string
      unmatchedDestinationBlock: string
      unmatchedDestinationAllow: string
      unmatchedDestinationSavedToast: string
      unmatchedDestinationSaveErrorToast: string
    }
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
    emptyDescription: string
    itemsCount: string
    paymentStatusColumn: string
    guestTitle: string
    guestDescription: string
    detailTitle: string
    viewDetail: string
    itemsTitle: string
    backToHistory: string
    notFoundTitle: string
    notFoundDescription: string
    unavailableTitle: string
    unavailableDescription: string
    statusLabels: {
      pending: string
      confirmed: string
      processing: string
      shipped: string
      delivered: string
      returned: string
      cancelled: string
    }
    paymentStatus: {
      pending: string
      paid: string
      failed: string
      refunded: string
    }
    // D23: the checkout quote, the success page, the order detail, the admin
    // order page and the orders export all read the same two phrases through
    // shippingStatusLabelKey (lib/shipping/status-label.ts) -- "rate" and a
    // legacy null render the formatted amount instead, never a phrase here.
    shippingStatusColumnLabel: string
    shippingStatusLabels: {
      agreed: string
      free: string
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
  // Página no encontrada (404)
  notFound: {
    heading: string
    goHome: string
    description: string
  }
  // Página de error
  errorPage: {
    heading: string
    description: string
    errorLabel: string
    tryAgain: string
  }
  // Restablecer contraseña desde el link del correo
  passwordReset: {
    verifying: string
    verifyingHint: string
    description: string
    newPassword: string
    updating: string
    updated: string
    updatedHint: string
    updateFailed: string
    goHome: string
    goToConsole: string
    linkRejected: string
    linkMissing: string
    linkExpired: string
    verificationUnavailable: string
    requestNewLink: string
  }
  // Cuenta propia de quien tiene sesión
  account: {
    title: string
    description: string
    emailFixed: string
    passwordDescription: string
    currentPassword: string
    changePassword: string
    passwordChanged: string
    passwordChangedHint: string
    wrongCurrentPassword: string
    samePassword: string
    guestTitle: string
    guestDescription: string
    profileTitle: string
    profileDescription: string
    profileSaved: string
    saveFailed: string
    addressesTitle: string
    addressesDescription: string
    addressesEmptyTitle: string
    addressesEmptyDescription: string
    addAddress: string
    newAddress: string
    editAddress: string
    editAddressNamed: string
    deleteAddressNamed: string
    addressLineRequired: string
    addressNickname: string
    addressNicknameHint: string
    unlabeledAddress: string
    addressSaved: string
    addressDeleted: string
    defaultAddressDeleted: string
    deleteAddressTitleNamed: string
    deleteAddressDescription: string
    deleteDefaultAddressDescription: string
    defaultAddress: string
    makeDefault: string
    defaultAddressChanged: string
    ordersTitle: string
    ordersDescription: string
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
    forgotPasswordTitle: string
    forgotPasswordDescription: string
    forgotPasswordDescription2: string
    emailSent: string
    checkEmail: string
    backToLogin: string
    sendToAnotherEmail: string
    emailPlaceholder: string
    sendRecoveryLink: string
    recoveryLinkError: string
    recoveryLinkErrorHint: string
    recoveryLinkSentTo: string
    recoveryLinkSpamHint: string
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
      orders: 'Mis pedidos',
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
      weightSectionTitle: 'Envío',
      weightSectionDescription: 'El peso se usa para calcular el costo de envío.',
      weightLabel: 'Peso (gramos) *',
      weightRequiredError: 'El peso es requerido',
      weightPublicLabel: 'Peso',
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
      shippingCalculatedAtCheckout: 'El envío se calcula en el checkout',
      discount: 'Descuento',
      total: 'Total',
      checkout: 'Finalizar compra',
      loading: 'Cargando carrito...',
      products: 'Productos',
      itemsCount: '{count} artículos',
      quantityLabel: 'Cantidad',
      combo: 'combo',
      continueShopping: 'Continuar comprando',
      remove: 'Eliminar',
      update: 'Actualizar',
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
      department: 'Departamento',
      selectDepartment: 'Selecciona un departamento',
      municipality: 'Municipio',
      selectMunicipality: 'Selecciona un municipio',
      selectDepartmentFirst: 'Primero selecciona un departamento',
      postalCode: 'Código postal',
      country: 'País',
      notes: 'Notas',
      paymentMethod: 'Método de pago',
      shippingConfirmedByStore: 'El costo de envío lo confirma la tienda al coordinar la entrega',
      guestLoginCta: 'Inicia sesión',
      unitPrice: 'Precio unitario',
      shippingCoordinationContact: 'Coordinas la entrega directamente con {storeName} por WhatsApp.',
      shippingCoordinationCta: 'Escribir por WhatsApp',
      shippingFree: 'Gratis',
      shippingOutOfZone: 'Tu municipio no tiene una tarifa de envío configurada. Coordina la entrega directamente con la tienda.',
      shippingBlocked: 'Esta tienda todavía no envía a tu municipio. Contáctala para coordinar antes de continuar con la compra.',
      shippingQuoteFailed: 'No pudimos calcular el envío en este momento. Intenta de nuevo.',
      shippingCalculating: 'Calculando el envío...',
      shippingSelectDestination: 'Elige tu destino para ver el costo de envío',
      totalPendingShipping: 'Se confirma al calcular el envío',
    },
    shipping: {
      settingsTitle: 'Envío',
      settingsSubtitle: 'Define cómo se calcula el envío en tu tienda.',
      modeLabel: 'Modo de envío',
      modeCoordinate: 'Coordinar con el cliente',
      modeOwnRates: 'Tarifas propias',
      saveButton: 'Guardar',
      saving: 'Guardando...',
      savedToast: 'Modo de envío actualizado',
      saveErrorToast: 'No se pudo guardar el modo de envío',
      summaryTitle: 'Envío',
      summaryModeLabel: 'Modo actual',
      summaryConfigureLink: 'Configurar envío',
      contactPhonePendingTitle: 'Falta tu teléfono de contacto',
      contactPhonePendingDescription:
        'Coordinas el envío con tus clientes por WhatsApp, pero todavía no configuraste un teléfono.',
      contactPhonePendingCta: 'Completar en Configuración',
      contactPhoneInvalidTitle: 'Tu teléfono no sirve para WhatsApp',
      contactPhoneInvalidDescription:
        'Guardaste un teléfono, pero no arma un enlace válido de WhatsApp. Revisa el número en Configuración.',
      contactPhoneInvalidCta: 'Corregir en Configuración',
      zones: {
        sectionTitle: 'Zonas de envío',
        sectionDescription: 'Define las zonas de entrega, sus destinos y su escalera de tarifas.',
        addButton: 'Agregar zona',
        createTitle: 'Nueva zona de envío',
        editTitle: 'Editar zona de envío',
        emptyTitle: 'Todavía no hay zonas de envío',
        emptyDescription: 'Agrega una zona para empezar a cobrar envío según el destino.',
        nameLabel: 'Nombre de la zona',
        namePlaceholder: 'Ej. Eje Cafetero',
        destinationsLabel: 'Destinos',
        departmentPlaceholder: 'Selecciona un departamento',
        addWholeDepartmentButton: 'Agregar departamento completo',
        addMunicipalityButton: 'Agregar municipio…',
        municipalitySearchPlaceholder: 'Buscar municipio…',
        loadingMunicipalities: 'Cargando municipios…',
        noMunicipalitiesFound: 'Sin resultados',
        wholeDepartmentPrefix: 'Todo:',
        removeDestinationLabel: 'Quitar destino',
        destinationsColumn: 'Destinos',
        basisColumn: 'Tarifa',
        actionsColumn: 'Acciones',
        basisLabel: 'Tipo de tarifa',
        basisFlat: 'Tarifa fija',
        basisOrderValue: 'Por valor del pedido',
        basisWeight: 'Por peso',
        flatAmountLabel: 'Monto',
        rangesLabel: 'Rangos',
        rangeFromLabel: 'Desde',
        rangeToLabel: 'Hasta',
        rangeToPlaceholder: 'Sin límite',
        rangeAmountLabel: 'Monto',
        addRangeButton: 'Agregar rango',
        removeRangeLabel: 'Quitar rango',
        codCommissionNote:
          'El monto ya debe incluir cualquier comisión de recaudo contraentrega que quieras cobrar. Los agregadores en Colombia cobran entre 4% y 4.3% del valor recaudado, con un mínimo de COP 4.900 a 5.700.',
        missingWeightTitle: 'Faltan productos con peso cargado',
        missingWeightDescription:
          'No puedes activar una tarifa por peso hasta que estos productos tengan peso:',
        viewProductLink: 'Editar producto',
        saveButton: 'Guardar zona',
        saving: 'Guardando...',
        cancelButton: 'Cancelar',
        savedToast: 'Zona de envío guardada',
        saveErrorToast: 'No se pudo guardar la zona de envío',
        deleteTitle: '¿Eliminar esta zona?',
        deleteDescription: 'Sus destinos y su escalera de tarifas se eliminarán junto con ella. Esta acción no se puede deshacer.',
        deleteConfirmButton: 'Eliminar',
        deletedToast: 'Zona de envío eliminada',
        deleteErrorToast: 'No se pudo eliminar la zona de envío',
        unmatchedDestinationTitle: 'Destino sin zona configurada',
        unmatchedDestinationDescription:
          'Qué pasa en el checkout cuando el destino del cliente no coincide con ninguna zona.',
        unmatchedDestinationBlock: 'Bloquear la compra',
        unmatchedDestinationAllow: 'Permitirla y coordinar el envío después',
        unmatchedDestinationSavedToast: 'Acción para destinos sin zona actualizada',
        unmatchedDestinationSaveErrorToast: 'No se pudo guardar la acción para destinos sin zona',
      },
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
      emptyDescription: 'Cuando hagas tu primera compra, la verás aquí.',
      itemsCount: '{count} artículos',
      paymentStatusColumn: 'Pago',
      guestTitle: 'Inicia sesión para ver tus pedidos',
      guestDescription: 'Crea una cuenta o inicia sesión para consultar el historial de tus compras.',
      detailTitle: 'Pedido {number}',
      viewDetail: 'Ver detalle',
      itemsTitle: 'Artículos',
      backToHistory: 'Volver a mis pedidos',
      notFoundTitle: 'No encontramos ese pedido',
      notFoundDescription: 'Revisa el número: puede estar mal copiado o pertenecer a otra cuenta.',
      unavailableTitle: 'No pudimos abrir tus pedidos',
      unavailableDescription: 'No logramos identificar la tienda en la que estás. Vuelve a intentarlo en unos segundos: tus pedidos siguen guardados.',
      statusLabels: {
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        processing: 'Procesando',
        shipped: 'Enviado',
        delivered: 'Entregado',
        returned: 'Devuelto',
        cancelled: 'Cancelado',
      },
      paymentStatus: {
        pending: 'Pendiente',
        paid: 'Pagado',
        failed: 'Fallido',
        refunded: 'Reembolsado',
      },
      shippingStatusColumnLabel: 'Estado de Envío',
      shippingStatusLabels: {
        agreed: 'A convenir con la tienda',
        free: 'Gratis',
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
    notFound: {
      heading: 'Página no encontrada',
      goHome: 'Volver al inicio',
      description:
        'Lo sentimos, no pudimos encontrar la página que buscás. Puede que haya sido movida, eliminada, o que hayas ingresado una URL incorrecta.',
    },
    errorPage: {
      heading: '¡Oh no!',
      description:
        'Hubo un problema con nuestra tienda. Puede ser un inconveniente temporal, por favor intentá tu acción de nuevo.',
      errorLabel: 'Error:',
      tryAgain: 'Intentar de nuevo',
    },
    passwordReset: {
      verifying: 'Verificando tu link',
      verifyingHint: 'Un momento, estamos comprobando el link de recuperación.',
      description: 'Ingresa tu nueva contraseña.',
      newPassword: 'Nueva contraseña',
      updating: 'Actualizando...',
      updated: '¡Contraseña restablecida!',
      updatedHint: 'Tu contraseña quedó actualizada. Ya puedes seguir con ella.',
      updateFailed: 'No pudimos actualizar tu contraseña',
      goHome: 'Ir al inicio',
      goToConsole: 'Ir a mi panel',
      linkRejected: 'Link inválido o expirado',
      linkMissing: 'Este link no trae los datos de recuperación. Solicita uno nuevo y ábrelo desde el correo.',
      linkExpired: 'El link de recuperación ya se usó o expiró. Solicita uno nuevo para continuar.',
      verificationUnavailable: 'No pudimos verificar el link en este momento. Vuelve a intentarlo en un minuto.',
      requestNewLink: 'Solicitar un link nuevo',
    },
    account: {
      title: 'Mi cuenta',
      description: 'Los datos con los que entras a tu cuenta.',
      emailFixed: 'Tu correo identifica la cuenta y no se cambia desde aquí.',
      passwordDescription: 'Para cambiarla, escribe la que usas hoy.',
      currentPassword: 'Contraseña actual',
      changePassword: 'Cambiar contraseña',
      passwordChanged: 'Contraseña actualizada',
      passwordChangedHint: 'La próxima vez que entres, usa la nueva.',
      wrongCurrentPassword: 'La contraseña actual no es correcta.',
      samePassword: 'La nueva contraseña tiene que ser distinta de la actual.',
      guestTitle: 'Inicia sesión para ver tu cuenta',
      guestDescription: 'Necesitas una sesión abierta para cambiar tu contraseña.',
      profileTitle: 'Tus datos',
      profileDescription: 'Con esto te identificamos y te contactamos por tus pedidos.',
      profileSaved: 'Datos guardados',
      saveFailed: 'No se pudo guardar',
      addressesTitle: 'Tus direcciones',
      addressesDescription: 'La predeterminada es la que el checkout completa por ti.',
      addressesEmptyTitle: 'Todavía no tienes direcciones guardadas',
      addressesEmptyDescription:
        'Guarda la primera y el checkout la traerá escrita la próxima vez que compres.',
      addAddress: 'Agregar dirección',
      newAddress: 'Nueva dirección',
      editAddress: 'Editar dirección',
      editAddressNamed: 'Editar {name}',
      deleteAddressNamed: 'Eliminar {name}',
      addressLineRequired: 'Escribe la dirección: es lo único obligatorio.',
      addressNickname: 'Nombre de la dirección',
      addressNicknameHint: 'Casa, oficina, donde te la reciben...',
      unlabeledAddress: 'Dirección sin nombre',
      addressSaved: 'Dirección guardada',
      addressDeleted: 'Dirección eliminada',
      defaultAddressDeleted: 'Dirección eliminada. Ahora el checkout completa {successor}.',
      deleteAddressTitleNamed: '¿Eliminar {name}?',
      deleteAddressDescription:
        'Vas a eliminar {address}. Sale de tu libreta y el checkout deja de traerla; los pedidos que ya la usaron no cambian.',
      deleteDefaultAddressDescription:
        'Vas a eliminar {address}, la que el checkout completa por ti. A partir de ahora completará {successor}; los pedidos que ya usaron la anterior no cambian.',
      defaultAddress: 'Predeterminada',
      makeDefault: 'Usar como predeterminada',
      defaultAddressChanged: 'Dirección predeterminada actualizada',
      ordersTitle: 'Tus pedidos',
      ordersDescription: 'Todo lo que has comprado en esta tienda, en un solo sitio.',
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
      forgotPasswordTitle: 'Recuperar Contraseña',
      forgotPasswordDescription: 'Ingresa tu correo electrónico y te enviaremos un link para restablecer tu contraseña',
      forgotPasswordDescription2: 'Revisa tu correo electrónico para restablecer tu contraseña',
      emailSent: 'Email Enviado',
      checkEmail: 'Revisa tu correo para restablecer tu contraseña',
      backToLogin: 'Volver a iniciar sesión',
      sendToAnotherEmail: 'Enviar a otro correo',
      emailPlaceholder: 'tu@email.com',
      sendRecoveryLink: 'Enviar link de recuperación',
      recoveryLinkError: 'Error al enviar email',
      recoveryLinkErrorHint: 'Por favor, intenta nuevamente',
      recoveryLinkSentTo: 'Hemos enviado un link de recuperación a:',
      recoveryLinkSpamHint: 'Si no recibes el email, verifica tu carpeta de spam o intenta nuevamente.',
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
      orders: 'My orders',
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
      weightSectionTitle: 'Shipping',
      weightSectionDescription: 'Weight is used to calculate the shipping cost.',
      weightLabel: 'Weight (grams) *',
      weightRequiredError: 'Weight is required',
      weightPublicLabel: 'Weight',
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
      shippingCalculatedAtCheckout: 'Shipping is calculated at checkout',
      discount: 'Discount',
      total: 'Total',
      checkout: 'Checkout',
      loading: 'Loading cart...',
      products: 'Products',
      itemsCount: '{count} items',
      quantityLabel: 'Quantity',
      combo: 'combo',
      continueShopping: 'Continue shopping',
      remove: 'Remove',
      update: 'Update',
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
      department: 'Department',
      selectDepartment: 'Select a department',
      municipality: 'Municipality',
      selectMunicipality: 'Select a municipality',
      selectDepartmentFirst: 'Select a department first',
      postalCode: 'Postal code',
      country: 'Country',
      notes: 'Notes',
      paymentMethod: 'Payment method',
      shippingConfirmedByStore: 'The store confirms the shipping cost when coordinating delivery',
      guestLoginCta: 'Log in',
      unitPrice: 'Unit price',
      shippingCoordinationContact: 'You coordinate delivery directly with {storeName} on WhatsApp.',
      shippingCoordinationCta: 'Message on WhatsApp',
      shippingFree: 'Free',
      shippingOutOfZone: "Your municipality doesn't have a shipping rate configured yet. Coordinate delivery directly with the store.",
      shippingBlocked: "This store doesn't ship to your municipality yet. Contact them to coordinate before continuing your purchase.",
      shippingQuoteFailed: "We couldn't calculate shipping right now. Please try again.",
      shippingCalculating: 'Calculating shipping...',
      shippingSelectDestination: 'Choose your destination to see the shipping cost',
      totalPendingShipping: 'Confirmed once shipping is calculated',
    },
    shipping: {
      settingsTitle: 'Shipping',
      settingsSubtitle: 'Define how shipping is calculated for your store.',
      modeLabel: 'Shipping mode',
      modeCoordinate: 'Coordinate with the customer',
      modeOwnRates: 'My own rates',
      saveButton: 'Save',
      saving: 'Saving...',
      savedToast: 'Shipping mode updated',
      saveErrorToast: 'Could not save the shipping mode',
      summaryTitle: 'Shipping',
      summaryModeLabel: 'Current mode',
      summaryConfigureLink: 'Configure shipping',
      contactPhonePendingTitle: 'Your contact phone is missing',
      contactPhonePendingDescription:
        'You coordinate shipping with your customers on WhatsApp, but you have not set a phone yet.',
      contactPhonePendingCta: 'Complete it in Settings',
      contactPhoneInvalidTitle: "Your phone doesn't work for WhatsApp",
      contactPhoneInvalidDescription:
        'You saved a phone, but it does not build a valid WhatsApp link. Check the number in Settings.',
      contactPhoneInvalidCta: 'Fix it in Settings',
      zones: {
        sectionTitle: 'Shipping zones',
        sectionDescription: 'Define your delivery zones, their destinations and their rate ladder.',
        addButton: 'Add zone',
        createTitle: 'New shipping zone',
        editTitle: 'Edit shipping zone',
        emptyTitle: 'No shipping zones yet',
        emptyDescription: 'Add a zone to start charging shipping by destination.',
        nameLabel: 'Zone name',
        namePlaceholder: 'E.g. Coffee Region',
        destinationsLabel: 'Destinations',
        departmentPlaceholder: 'Select a department',
        addWholeDepartmentButton: 'Add the whole department',
        addMunicipalityButton: 'Add municipality…',
        municipalitySearchPlaceholder: 'Search municipality…',
        loadingMunicipalities: 'Loading municipalities…',
        noMunicipalitiesFound: 'No results',
        wholeDepartmentPrefix: 'Whole:',
        removeDestinationLabel: 'Remove destination',
        destinationsColumn: 'Destinations',
        basisColumn: 'Rate',
        actionsColumn: 'Actions',
        basisLabel: 'Rate type',
        basisFlat: 'Flat rate',
        basisOrderValue: 'By order value',
        basisWeight: 'By weight',
        flatAmountLabel: 'Amount',
        rangesLabel: 'Ranges',
        rangeFromLabel: 'From',
        rangeToLabel: 'To',
        rangeToPlaceholder: 'No limit',
        rangeAmountLabel: 'Amount',
        addRangeButton: 'Add range',
        removeRangeLabel: 'Remove range',
        codCommissionNote:
          'The amount should already include any cash-on-delivery collection fee you want to charge. Colombian aggregators charge 4%-4.3% of the collected amount, with a minimum of COP 4,900-5,700.',
        missingWeightTitle: 'Products missing weight',
        missingWeightDescription: 'You cannot activate a weight-based rate until these products have a weight:',
        viewProductLink: 'Edit product',
        saveButton: 'Save zone',
        saving: 'Saving...',
        cancelButton: 'Cancel',
        savedToast: 'Shipping zone saved',
        saveErrorToast: 'Could not save the shipping zone',
        deleteTitle: 'Delete this zone?',
        deleteDescription: 'Its destinations and rate ladder will be deleted along with it. This action cannot be undone.',
        deleteConfirmButton: 'Delete',
        deletedToast: 'Shipping zone deleted',
        deleteErrorToast: 'Could not delete the shipping zone',
        unmatchedDestinationTitle: 'Destination with no configured zone',
        unmatchedDestinationDescription:
          'What happens at checkout when the customer\'s destination matches no zone.',
        unmatchedDestinationBlock: 'Block the purchase',
        unmatchedDestinationAllow: 'Allow it and coordinate shipping afterward',
        unmatchedDestinationSavedToast: 'Unmatched destination action updated',
        unmatchedDestinationSaveErrorToast: 'Could not save the unmatched destination action',
      },
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
      emptyDescription: 'Once you place your first order, you will see it here.',
      itemsCount: '{count} items',
      paymentStatusColumn: 'Payment',
      guestTitle: 'Log in to see your orders',
      guestDescription: 'Create an account or log in to check your purchase history.',
      detailTitle: 'Order {number}',
      viewDetail: 'View details',
      itemsTitle: 'Items',
      backToHistory: 'Back to my orders',
      notFoundTitle: 'We could not find that order',
      notFoundDescription: 'Check the number: it may be mistyped or belong to another account.',
      unavailableTitle: 'We could not open your orders',
      unavailableDescription: 'We could not identify the store you are in. Try again in a few seconds: your orders are still saved.',
      statusLabels: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        returned: 'Returned',
        cancelled: 'Cancelled',
      },
      paymentStatus: {
        pending: 'Pending',
        paid: 'Paid',
        failed: 'Failed',
        refunded: 'Refunded',
      },
      shippingStatusColumnLabel: 'Shipping status',
      shippingStatusLabels: {
        agreed: 'Arranged with the store',
        free: 'Free',
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
    notFound: {
      heading: 'Page Not Found',
      goHome: 'Go Back Home',
      description:
        "Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you entered the wrong URL.",
    },
    errorPage: {
      heading: 'Oh no!',
      description:
        'There was an issue with our storefront. This could be a temporary issue, please try your action again.',
      errorLabel: 'Error:',
      tryAgain: 'Try Again',
    },
    passwordReset: {
      verifying: 'Checking your link',
      verifyingHint: 'One moment, we are checking the recovery link.',
      description: 'Enter your new password.',
      newPassword: 'New password',
      updating: 'Updating...',
      updated: 'Password reset!',
      updatedHint: 'Your password is updated. You can carry on with it now.',
      updateFailed: 'We could not update your password',
      goHome: 'Go to home',
      goToConsole: 'Go to my dashboard',
      linkRejected: 'Invalid or expired link',
      linkMissing: 'This link carries no recovery data. Request a new one and open it from your email.',
      linkExpired: 'The recovery link was already used or has expired. Request a new one to continue.',
      verificationUnavailable: 'We could not check the link right now. Please try again in a minute.',
      requestNewLink: 'Request a new link',
    },
    account: {
      title: 'My account',
      description: 'The details you use to sign in.',
      emailFixed: 'Your email identifies the account and cannot be changed here.',
      passwordDescription: 'To change it, type the one you use today.',
      currentPassword: 'Current password',
      changePassword: 'Change password',
      passwordChanged: 'Password updated',
      passwordChangedHint: 'Next time you sign in, use the new one.',
      wrongCurrentPassword: 'That is not your current password.',
      samePassword: 'The new password must be different from the current one.',
      guestTitle: 'Sign in to see your account',
      guestDescription: 'You need an open session to change your password.',
      profileTitle: 'Your details',
      profileDescription: 'How we identify you and reach you about your orders.',
      profileSaved: 'Details saved',
      saveFailed: 'We could not save',
      addressesTitle: 'Your addresses',
      addressesDescription: 'The default one is what checkout fills in for you.',
      addressesEmptyTitle: 'You have no saved addresses yet',
      addressesEmptyDescription:
        'Save the first one and checkout will bring it already written next time you buy.',
      addAddress: 'Add address',
      newAddress: 'New address',
      editAddress: 'Edit address',
      editAddressNamed: 'Edit {name}',
      deleteAddressNamed: 'Delete {name}',
      addressLineRequired: 'Type the address: it is the only required field.',
      addressNickname: 'Address name',
      addressNicknameHint: 'Home, office, where they take it for you...',
      unlabeledAddress: 'Unnamed address',
      addressSaved: 'Address saved',
      addressDeleted: 'Address deleted',
      defaultAddressDeleted: 'Address deleted. Checkout now fills in {successor}.',
      deleteAddressTitleNamed: 'Delete {name}?',
      deleteAddressDescription:
        'You are deleting {address}. It leaves your address book and checkout stops bringing it; orders that already used it do not change.',
      deleteDefaultAddressDescription:
        'You are deleting {address}, the one checkout fills in for you. From now on it will fill in {successor}; orders that already used the old one do not change.',
      defaultAddress: 'Default',
      makeDefault: 'Use as default',
      defaultAddressChanged: 'Default address updated',
      ordersTitle: 'Your orders',
      ordersDescription: 'Everything you have bought in this store, in one place.',
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
      forgotPasswordTitle: 'Recover Password',
      forgotPasswordDescription: 'Enter your email address and we will send you a link to reset your password',
      forgotPasswordDescription2: 'Check your email to reset your password',
      emailSent: 'Email Sent',
      checkEmail: 'Check your email to reset your password',
      backToLogin: 'Back to login',
      sendToAnotherEmail: 'Send to another email',
      emailPlaceholder: 'you@email.com',
      sendRecoveryLink: 'Send recovery link',
      recoveryLinkError: 'Could not send the email',
      recoveryLinkErrorHint: 'Please try again',
      recoveryLinkSentTo: 'We sent a recovery link to:',
      recoveryLinkSpamHint: 'If the email does not arrive, check your spam folder or try again.',
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
      orders: 'Meus pedidos',
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
      weightSectionTitle: 'Envio',
      weightSectionDescription: 'O peso é usado para calcular o custo de envio.',
      weightLabel: 'Peso (gramas) *',
      weightRequiredError: 'O peso é obrigatório',
      weightPublicLabel: 'Peso',
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
      shippingCalculatedAtCheckout: 'O frete é calculado no checkout',
      discount: 'Desconto',
      total: 'Total',
      checkout: 'Finalizar compra',
      loading: 'Carregando carrinho...',
      products: 'Produtos',
      itemsCount: '{count} itens',
      quantityLabel: 'Quantidade',
      combo: 'combo',
      continueShopping: 'Continuar comprando',
      remove: 'Remover',
      update: 'Atualizar',
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
      department: 'Departamento',
      selectDepartment: 'Selecione um departamento',
      municipality: 'Município',
      selectMunicipality: 'Selecione um município',
      selectDepartmentFirst: 'Selecione primeiro um departamento',
      postalCode: 'CEP',
      country: 'País',
      notes: 'Observações',
      paymentMethod: 'Método de pagamento',
      shippingConfirmedByStore: 'A loja confirma o custo de frete ao combinar a entrega',
      guestLoginCta: 'Entrar',
      unitPrice: 'Preço unitário',
      shippingCoordinationContact: 'Você combina a entrega diretamente com {storeName} pelo WhatsApp.',
      shippingCoordinationCta: 'Enviar mensagem no WhatsApp',
      shippingFree: 'Grátis',
      shippingOutOfZone: 'Seu município ainda não tem uma tarifa de frete configurada. Combine a entrega diretamente com a loja.',
      shippingBlocked: 'Esta loja ainda não envia para o seu município. Fale com a loja para combinar antes de continuar a compra.',
      shippingQuoteFailed: 'Não conseguimos calcular o frete agora. Tente novamente.',
      shippingCalculating: 'Calculando o frete...',
      shippingSelectDestination: 'Escolha seu destino para ver o custo do frete',
      totalPendingShipping: 'Confirmado ao calcular o frete',
    },
    shipping: {
      settingsTitle: 'Envio',
      settingsSubtitle: 'Defina como o frete é calculado na sua loja.',
      modeLabel: 'Modo de envio',
      modeCoordinate: 'Combinar com o cliente',
      modeOwnRates: 'Minhas próprias tarifas',
      saveButton: 'Salvar',
      saving: 'Salvando...',
      savedToast: 'Modo de envio atualizado',
      saveErrorToast: 'Não foi possível salvar o modo de envio',
      summaryTitle: 'Envio',
      summaryModeLabel: 'Modo atual',
      summaryConfigureLink: 'Configurar envio',
      contactPhonePendingTitle: 'Falta o seu telefone de contato',
      contactPhonePendingDescription:
        'Você combina o envio com seus clientes pelo WhatsApp, mas ainda não configurou um telefone.',
      contactPhonePendingCta: 'Completar em Configurações',
      contactPhoneInvalidTitle: 'Seu telefone não funciona no WhatsApp',
      contactPhoneInvalidDescription:
        'Você salvou um telefone, mas ele não gera um link válido do WhatsApp. Revise o número em Configurações.',
      contactPhoneInvalidCta: 'Corrigir em Configurações',
      zones: {
        sectionTitle: 'Zonas de frete',
        sectionDescription: 'Defina as zonas de entrega, seus destinos e sua escada de tarifas.',
        addButton: 'Adicionar zona',
        createTitle: 'Nova zona de frete',
        editTitle: 'Editar zona de frete',
        emptyTitle: 'Ainda não há zonas de frete',
        emptyDescription: 'Adicione uma zona para começar a cobrar frete por destino.',
        nameLabel: 'Nome da zona',
        namePlaceholder: 'Ex. Eixo Cafeeiro',
        destinationsLabel: 'Destinos',
        departmentPlaceholder: 'Selecione um departamento',
        addWholeDepartmentButton: 'Adicionar departamento completo',
        addMunicipalityButton: 'Adicionar município…',
        municipalitySearchPlaceholder: 'Buscar município…',
        loadingMunicipalities: 'Carregando municípios…',
        noMunicipalitiesFound: 'Sem resultados',
        wholeDepartmentPrefix: 'Todo:',
        removeDestinationLabel: 'Remover destino',
        destinationsColumn: 'Destinos',
        basisColumn: 'Tarifa',
        actionsColumn: 'Ações',
        basisLabel: 'Tipo de tarifa',
        basisFlat: 'Tarifa fixa',
        basisOrderValue: 'Por valor do pedido',
        basisWeight: 'Por peso',
        flatAmountLabel: 'Valor',
        rangesLabel: 'Faixas',
        rangeFromLabel: 'De',
        rangeToLabel: 'Até',
        rangeToPlaceholder: 'Sem limite',
        rangeAmountLabel: 'Valor',
        addRangeButton: 'Adicionar faixa',
        removeRangeLabel: 'Remover faixa',
        codCommissionNote:
          'O valor já deve incluir qualquer comissão de coleta contra entrega que você queira cobrar. Os agregadores na Colômbia cobram entre 4% e 4,3% do valor coletado, com mínimo de COP 4.900 a 5.700.',
        missingWeightTitle: 'Faltam produtos com peso cadastrado',
        missingWeightDescription: 'Você não pode ativar uma tarifa por peso até que estes produtos tenham peso:',
        viewProductLink: 'Editar produto',
        saveButton: 'Salvar zona',
        saving: 'Salvando...',
        cancelButton: 'Cancelar',
        savedToast: 'Zona de frete salva',
        saveErrorToast: 'Não foi possível salvar a zona de frete',
        deleteTitle: 'Excluir esta zona?',
        deleteDescription: 'Seus destinos e sua escada de tarifas serão excluídos junto com ela. Esta ação não pode ser desfeita.',
        deleteConfirmButton: 'Excluir',
        deletedToast: 'Zona de frete excluída',
        deleteErrorToast: 'Não foi possível excluir a zona de frete',
        unmatchedDestinationTitle: 'Destino sem zona configurada',
        unmatchedDestinationDescription: 'O que acontece no checkout quando o destino do cliente não corresponde a nenhuma zona.',
        unmatchedDestinationBlock: 'Bloquear a compra',
        unmatchedDestinationAllow: 'Permitir e combinar o frete depois',
        unmatchedDestinationSavedToast: 'Ação para destinos sem zona atualizada',
        unmatchedDestinationSaveErrorToast: 'Não foi possível salvar a ação para destinos sem zona',
      },
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
      emptyDescription: 'Quando você fizer sua primeira compra, ela vai aparecer aqui.',
      itemsCount: '{count} itens',
      paymentStatusColumn: 'Pagamento',
      guestTitle: 'Entre para ver seus pedidos',
      guestDescription: 'Crie uma conta ou entre para consultar o histórico das suas compras.',
      detailTitle: 'Pedido {number}',
      viewDetail: 'Ver detalhes',
      itemsTitle: 'Itens',
      backToHistory: 'Voltar aos meus pedidos',
      notFoundTitle: 'Não encontramos esse pedido',
      notFoundDescription: 'Confira o número: pode estar copiado errado ou pertencer a outra conta.',
      unavailableTitle: 'Não conseguimos abrir seus pedidos',
      unavailableDescription: 'Não conseguimos identificar a loja em que você está. Tente de novo em alguns segundos: seus pedidos continuam guardados.',
      statusLabels: {
        pending: 'Pendente',
        confirmed: 'Confirmado',
        processing: 'Processando',
        shipped: 'Enviado',
        delivered: 'Entregue',
        returned: 'Devolvido',
        cancelled: 'Cancelado',
      },
      paymentStatus: {
        pending: 'Pendente',
        paid: 'Pago',
        failed: 'Falhou',
        refunded: 'Reembolsado',
      },
      shippingStatusColumnLabel: 'Status do frete',
      shippingStatusLabels: {
        agreed: 'A combinar com a loja',
        free: 'Grátis',
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
    notFound: {
      heading: 'Página não encontrada',
      goHome: 'Voltar ao início',
      description:
        'Desculpe, não conseguimos encontrar a página que você procura. Ela pode ter sido movida, excluída, ou você digitou uma URL incorreta.',
    },
    errorPage: {
      heading: 'Oh não!',
      description:
        'Houve um problema com nossa loja. Pode ser um problema temporário, por favor tente sua ação novamente.',
      errorLabel: 'Erro:',
      tryAgain: 'Tentar novamente',
    },
    passwordReset: {
      verifying: 'Verificando seu link',
      verifyingHint: 'Um momento, estamos conferindo o link de recuperação.',
      description: 'Digite sua nova senha.',
      newPassword: 'Nova senha',
      updating: 'Atualizando...',
      updated: 'Senha redefinida!',
      updatedHint: 'Sua senha foi atualizada. Já pode seguir com ela.',
      updateFailed: 'Não conseguimos atualizar sua senha',
      goHome: 'Ir ao início',
      goToConsole: 'Ir ao meu painel',
      linkRejected: 'Link inválido ou expirado',
      linkMissing: 'Este link não traz os dados de recuperação. Solicite um novo e abra pelo e-mail.',
      linkExpired: 'O link de recuperação já foi usado ou expirou. Solicite um novo para continuar.',
      verificationUnavailable: 'Não conseguimos verificar o link agora. Tente novamente em um minuto.',
      requestNewLink: 'Solicitar um novo link',
    },
    account: {
      title: 'Minha conta',
      description: 'Os dados com que você entra na sua conta.',
      emailFixed: 'Seu e-mail identifica a conta e não se altera por aqui.',
      passwordDescription: 'Para alterá-la, digite a que você usa hoje.',
      currentPassword: 'Senha atual',
      changePassword: 'Alterar senha',
      passwordChanged: 'Senha atualizada',
      passwordChangedHint: 'Na próxima vez que entrar, use a nova.',
      wrongCurrentPassword: 'Essa não é a sua senha atual.',
      samePassword: 'A nova senha precisa ser diferente da atual.',
      guestTitle: 'Entre para ver sua conta',
      guestDescription: 'Você precisa de uma sessão aberta para alterar sua senha.',
      profileTitle: 'Seus dados',
      profileDescription: 'É assim que identificamos você e falamos sobre seus pedidos.',
      profileSaved: 'Dados salvos',
      saveFailed: 'Não foi possível salvar',
      addressesTitle: 'Seus endereços',
      addressesDescription: 'O padrão é o que o checkout preenche para você.',
      addressesEmptyTitle: 'Você ainda não tem endereços salvos',
      addressesEmptyDescription:
        'Salve o primeiro e o checkout já o trará escrito na próxima compra.',
      addAddress: 'Adicionar endereço',
      newAddress: 'Novo endereço',
      editAddress: 'Editar endereço',
      editAddressNamed: 'Editar {name}',
      deleteAddressNamed: 'Excluir {name}',
      addressLineRequired: 'Escreva o endereço: é o único campo obrigatório.',
      addressNickname: 'Nome do endereço',
      addressNicknameHint: 'Casa, escritório, onde recebem para você...',
      unlabeledAddress: 'Endereço sem nome',
      addressSaved: 'Endereço salvo',
      addressDeleted: 'Endereço excluído',
      defaultAddressDeleted: 'Endereço excluído. Agora o checkout preenche {successor}.',
      deleteAddressTitleNamed: 'Excluir {name}?',
      deleteAddressDescription:
        'Você vai excluir {address}. Ele sai da sua lista e o checkout deixa de trazê-lo; os pedidos que já o usaram não mudam.',
      deleteDefaultAddressDescription:
        'Você vai excluir {address}, o que o checkout preenche para você. A partir de agora ele preencherá {successor}; os pedidos que já usaram o anterior não mudam.',
      defaultAddress: 'Padrão',
      makeDefault: 'Usar como padrão',
      defaultAddressChanged: 'Endereço padrão atualizado',
      ordersTitle: 'Seus pedidos',
      ordersDescription: 'Tudo o que você comprou nesta loja, em um só lugar.',
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
      forgotPasswordTitle: 'Recuperar Senha',
      forgotPasswordDescription: 'Digite seu endereço de e-mail e enviaremos um link para redefinir sua senha',
      forgotPasswordDescription2: 'Verifique seu e-mail para redefinir sua senha',
      emailSent: 'E-mail Enviado',
      checkEmail: 'Verifique seu e-mail para redefinir sua senha',
      backToLogin: 'Voltar ao login',
      sendToAnotherEmail: 'Enviar para outro e-mail',
      emailPlaceholder: 'voce@email.com',
      sendRecoveryLink: 'Enviar link de recuperação',
      recoveryLinkError: 'Erro ao enviar o e-mail',
      recoveryLinkErrorHint: 'Por favor, tente novamente',
      recoveryLinkSentTo: 'Enviamos um link de recuperação para:',
      recoveryLinkSpamHint: 'Se o e-mail não chegar, verifique sua caixa de spam ou tente novamente.',
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
    },
  },
}

