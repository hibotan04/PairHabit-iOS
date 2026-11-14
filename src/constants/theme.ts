export const THEME_COLORS = [
  { id: 'mocha', name: 'Mocha Pink', color: '#8f7161' },
  { id: 'sakuramochi', name: 'Sakura Mochi', color: '#f0bfb1' },
];

export const THEME_PALETTES: Record<string, any> = {
  '#8f7161': { // Mocha
    global: {
      bg: '#fff8fa',
    },
    header: {
      bg: '#ad9f97',
      text: '#ffffff',
      iconBg: '#f5f5f4', // stone-100
    },
    footer: {
      bg: '#ad9f97',
      activeIcon: '#ffffff',
      inactiveIcon: 'rgba(255, 255, 255, 0.6)',
    },
    settings: {
      iconBg: '#ede0d8',
      iconColor: '#8f7161',
      activeOptionBg: '#8f7161',
      activeOptionBorder: 'transparent',
      activeOptionText: 'white',
      text: '#705d53',
    },
    memories: {
      title: '#705d53',
      cardTitle: '#705d53',
      priceBadgeBg: '#8f7161',
    },
    chat: {
      bubbleBg: '#8f7161',
      bubbleText: 'white',
      inputAreaBg: '#ad9f97',
      inputBg: '#ede0d8',
      inputText: '#ad9f97',
      sendBtnBg: '#ede0d8',
      sendBtnIcon: 'white',
      receivedBubbleBg: '#ffccd9',
      receivedBubbleText: '#8f7161',
    },
    contribution: ['#e1ccc0', '#bd8d72', '#8d5a3f', '#522208'],
    incomplete: {
      bg: '#ede0d8',
      border: 'transparent',
      text: '#8f7161',
      checkboxBg: '#ffffff',
      checkboxIcon: '#ede0d8',
      badgeBg: 'transparent',
    },
    completed: {
      bg: '#ad9f97',
      text: '#705d53',
      checkboxBg: '#705d53',
      checkmark: '#ad9f97',
      badgeBg: 'transparent',
    },
    goal: {
      cardBg: 'white',
      border: '#f5f5f4',
      progressBg: '#f5f5f4',
      progressFill: '#8f7161',
      buttonBg: '#8f7161',
      buttonText: 'white',
      textBadgeBg: '#8f7161',
      emojiBg: 'rgba(143, 113, 97, 0.1)',
      textColor: '#8f7161',
      noNameShadow: true,
    },
    statistics: {
      habitName: '#705d53',
    },
    date: '#8f7161',
  },
  '#f0bfb1': { // Sakuramochi (Key must match the themeColor stored in DB)
    incomplete: {
      bg: '#ffe6e7',
      border: 'transparent',
      text: '#d47d76',
      checkboxBg: '#fdfbf7',
      checkboxIcon: '#d47d76', // "Plus mark" color (Icon Color)
      badgeBg: '#ffe6e7',
    },
    settings: {
      iconBg: '#ffe6e7',
      iconColor: '#f49e98',
      activeOptionBg: '#f0bfb1',
      activeOptionBorder: 'transparent',
      activeOptionText: 'white',
      text: '#78716c',
    },
    memories: {
      title: '#78716c',
      cardTitle: '#78716c',
      priceBadgeBg: '#d47d76',
    },
    completed: {
      bg: '#8c9c49',
      text: '#474e27',
      checkboxBg: '#474e27',
      checkmark: '#fdfbf7',
      badgeBg: 'transparent',
    },
    goal: {
      cardBg: '#e5edc3',
      border: 'transparent',
      progressBg: '#e7e5e4', // Gray
      progressFill: '#7a9407',
      buttonBg: '#7a9407',
      buttonText: '#fdfbf7',
      textBadgeBg: '#d47d76',
      emojiBg: 'transparent',
      textColor: '#474e27', // Green
      progressSectionBg: 'white',
      noNameShadow: true,
    },
    statistics: {
      habitName: '#78716c',
      activeSwitcherBg: 'white',
      activeSwitcherText: '#d47d76',
      inactiveSwitcherText: 'rgba(212, 125, 118, 0.6)',
    },
    global: {
      bg: '#fdfbf7',
    },
    header: {
      bg: '#ffe6e7',
      text: '#d47d76',
      iconBg: '#fdfbf7',
    },
    chat: {
      bubbleBg: '#ffe6e7',
      bubbleText: '#d47d76',
      inputAreaBg: '#e5edc3',
      inputBg: '#faffe6',
      inputText: '#8c9c49',
      sendBtnBg: '#a4ad7d',
      sendBtnIcon: '#fdfbf7',
      receivedBubbleBg: '#e5edc3',
      receivedBubbleText: '#708610',
    },
    contribution: ['#f7d0d1', '#f49e98', '#d47d76', '#a23931'],
    footer: {
      bg: '#e5edc3',
      activeIcon: '#708610',
      inactiveIcon: '#a4ad7d',
    }
  }
};
