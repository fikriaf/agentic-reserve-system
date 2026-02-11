#!/bin/bash
# Generate IDL files manually from deployed programs

echo "Generating IDL files from deployed programs..."

# Create target/idl directory if it doesn't exist
mkdir -p target/idl

# Generate IDL for ars-core
echo "Generating IDL for ars-core..."
anchor idl init --filepath target/idl/ars_core.json 9JhnkugG8q9QG9LedUs2F93H9xJ9zSHcn5Zfm1uzF624

# Generate IDL for ars-reserve
echo "Generating IDL for ars-reserve..."
anchor idl init --filepath target/idl/ars_reserve.json 6ojet9MMHSZiXoZ3w4AM72EKzFe7cMgw2toCrtmBjEER

# Generate IDL for ars-token
echo "Generating IDL for ars-token..."
anchor idl init --filepath target/idl/ars_token.json 8Eh2foHjxgoHcQ69HPvGGijiLCXzncnB6bpTrRp94VoG

echo "IDL generation complete!"
echo "IDL files are in target/idl/"
