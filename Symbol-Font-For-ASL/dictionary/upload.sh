>dictionary/upload_compiled.sh
cat s3/dictionary/changed_files.txt | grep "\.entries\." | sed -E -e 's/^(.*)$/s3cmd put s3\/dictionary\/index\/\1 s3:\/\/aslfont\/dictionary\/index\//' >> dictionary/upload_compiled.sh
cat s3/dictionary/changed_files.txt | grep "\.json" | sed -E -e 's/^(.*)$/s3cmd put s3\/dictionary\/entries\/\1 s3:\/\/aslfont\/dictionary\/entries\//' >> dictionary/upload_compiled.sh
echo "s3cmd put s3/dictionary/index.json s3://aslfont/dictionary/" >> dictionary/upload_compiled.sh
chmod +x dictionary/upload_compiled.sh
dictionary/upload_compiled.sh
>s3/dictionary/changed_files.txt