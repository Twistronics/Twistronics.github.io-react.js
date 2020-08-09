import React from "react"
import { Link, graphql } from "gatsby"

import { rhythm } from "../utils/typography"
import styles from "./blog-post.module.sass"
import Layout from "../components/layout"
import Title from "../components/title"

const TagPageTemplate = ({ data, pageContext, location }) => {
  const posts = data.allMarkdownRemark.edges

  return (
    // <div><pre>{JSON.stringify(posts, null, 4)}</pre></div>

    <Layout location={location}>
      <Title to="/all-tags">Tag: {pageContext.tag}</Title>

      {posts.map(({ node }) => {
        const title = node.frontmatter.title || node.fields.slug
        return (
          <article key={node.fields.slug}>
            <header>
              <h3
                style={{
                  marginBottom: rhythm(1 / 4),
                }}
              >
                <Link style={{ boxShadow: `none` }} to={node.fields.slug}>
                  {title}
                </Link>
              </h3>
              <div>
                <small style={{ marginRight: "2rem", whiteSpace: "nowrap" }}>
                  {node.frontmatter.date}
                </small>
                {node.frontmatter.tags.map(element => (
                  <Link
                    to={`/tag/${element}`}
                    style={{ backgroundImage: `none` }}
                  >
                    <li className={styles["blogTagSmallSize"]}>{element}</li>
                  </Link>
                ))}
              </div>
            </header>
            <section>
              <p
                dangerouslySetInnerHTML={{
                  __html: node.frontmatter.description || node.excerpt,
                }}
              />
            </section>
          </article>
        )
      })}
    </Layout>
  )
}

export default TagPageTemplate

export const pageQuery = graphql`
  query TagPage($tag: String!) {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      filter: { frontmatter: { tags: { in: [$tag] } } }
      sort: { order: DESC, fields: [frontmatter___date] }
    ) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            title
            date(formatString: "MMMM DD, YYYY")
            description
            tags
          }
        }
      }
    }
  }
`
