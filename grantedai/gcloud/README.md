# grantedai
python services for grantedai website
to use:
1. Activate the virtual environment locally:
source /Users/natecow/Documents/Python/Granted/env/bin/activate
2. Test locally:
functions-framework --target=main
3. Update git repo:
git add .
git commit -m "blah blah blah" 
git push -u origin main
4. Deploy to gcloud:
gcloud functions deploy main --runtime python311 --trigger-http --allow-unauthenticated --timeout=540 
