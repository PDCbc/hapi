echo "running code coverage..."
mocha -c --recursive --require blanket -R html-cov > coverage.html
echo "running unit tests..."
mocha -c --recursive -R landing
echo "tests done, goodbye."
