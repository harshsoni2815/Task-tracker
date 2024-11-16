const formatCommodityName = (commodityName) => {
    // Extract the port number (first sequence of digits)
    const portNumberMatch = commodityName.match(/\d+/);
    
    const portNumber = portNumberMatch ? portNumberMatch[0] : '';

    // Extract the first two unique words after port number
    const words = commodityName.replace(portNumber, '').split(/\s+/);
    console.log("words:",words);
    const words1 = commodityName.replace(portNumber, '').split(" ");
    console.log("words1:",words1);
    const uniqueWords = [...new Set(words.filter(Boolean))].slice(0, 3);

    // Combine port number and unique words
    return `${portNumber} - ${uniqueWords.join(' ')}`;
  };

  formatCommodityName('01021010 - LIVE BOVINE ANIMALS - BULLS - PURE 3030-BRED BREEDING ANIMALS : ADULT');