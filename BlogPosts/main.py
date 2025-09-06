import openai
import os
import pandas as pd

openai.api_key = os.getenv("OPENAI_API_KEY")
FUNCTION_TIMEOUT = 538 # seconds, based on google cloudn function timeout of 540 seconds
title_csv = "BlogPostTitles.csv"

def read_titles(title_csv):
    titles = []
    with open(title_csv, 'r') as f:
        for line in f:
            titles.append(line.strip())
    return titles  


def write_blogpost(title, df):

    prompt = "Craft a highly informative, engaging, and SEO-optimized blog post centered around '"+title+"', specifically designed to cater to grant proposal writers seeking to elevate their skills and knowledge. Deliver practical advice, best practices, and actionable tips, incorporating concrete examples and analogies derived from your extensive expertise in grant writing books and articles. Include real-life examples of successful grant applications, common mistakes, and effective strategies related to the topic. Provide detailed guidelines, in-depth information, and advice on effective communication with funders. Focus on the importance of establishing measurable objectives, outcomes, and transparent reporting. Start the blog post with a captivating heading ([h2]<heading text>[/h2]) and a pertinent subheading ([h3]<subheading text>[/h3]) to ensure a well-organized and reader-friendly format using bbcode markup for bold and italicize keywords, quotations, tables, bullets, numeric lists, and all other formatting. Strategically weave relevant keywords and phrases throughout the post to boost search engine rankings and drive increased traffic to GrantedAI.com. Offer valuable insights and resources that not only empower grant writers to excel in their profession but also establish GrantedAI.com as a trusted authority in the grant writing community."
    

    body = "'''\n[Blogpost Title]: " + title + "''' \n" + prompt
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful grant proposal writing instuctor."},
            {"role": "user", "content": body},
            ],
        temperature=0,
        request_timeout=FUNCTION_TIMEOUT,
        )
    text = response['choices'][0]['message']['content']

    # Write the content of the post to a dataframe with columns title and post
    df = df.append({'title': title, 'post': text}, ignore_index=True)
    return df
    

    # Write the content of the post to a csv file with columns title and post
    #with open('blogposts.csv', 'a') as f:
    #    f.write(title + "," + text + "\n")

titles = read_titles(title_csv)
df = pd.DataFrame(columns=['title', 'post'])
for t in titles:
    df = write_blogpost(t, df)
    
# Write the content of the post to a csv file with columns title and post
df.to_csv("blogposts.csv")
#df.to_pickle("blogposts2.pkl")


# write a function that provides a random number of likes between 45 and 170 to each post 