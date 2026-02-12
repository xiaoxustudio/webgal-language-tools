rimraf node_modules package-lock.yaml
cd ./packages/language-service
rimraf node_modules
cd ../language-server
rimraf node_modules
cd ../language-core
rimraf node_modules
cd ../playground
rimraf node_modules
cd ../vscode-extension
rimraf node_modules
cd ../../
pnpm i