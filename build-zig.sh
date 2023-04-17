if [ -d "./zig/out" ]; then
    rm -r ./zig/out
fi

mkdir ./zig/out
cd ./zig/out
zig build-lib ../src/flg.zig -target wasm32-freestanding -dynamic -O ReleaseSafe
cp flg.wasm ../../public
zig test -femit-bin=./flg-test ../src/flg.zig -O Debug
#zig test ../src/flg.zig
