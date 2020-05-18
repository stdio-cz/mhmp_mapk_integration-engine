const waitTillStreamEnds = async (stream) => {
  await new Promise((resolve) => {

    const checker = setInterval( async () => {
        // con not use on.end handler directly
        if (stream.destroyed) {
            clearInterval(checker);
            resolve();
        }
    }, 100);

  });
};

export {
  waitTillStreamEnds,
};
