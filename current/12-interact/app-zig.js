function doZiggy() {

  const req = new XMLHttpRequest();
  req.open('GET', 'flg.wasm');
  req.responseType = 'arraybuffer';
  req.send();

  req.onload = function () {
    const bytes = req.response;
    WebAssembly.instantiate(bytes, {
      env: {}
    }).then(result => {
      const zig = result.instance.exports;
      const res = zig.initFlowLineGenerator(740, 525, 3, 24, 12, true);
      console.log(res);

      // const memory = result.instance.exports.memory;
      // const array = new Int32Array(memory.buffer, 0, 5);
      // array.set([3, 15, 18, 4, 2])
      // const add = result.instance.exports.add;
      // console.log(add(3, 5));
      // const sum = result.instance.exports.sum;
      // console.log(sum(array.byteOffset, array.length));
      // console.log(array[0]);
    });
  };

}

export {doZiggy}
