import React from "react"
import { graphql, Link } from "gatsby"
import Layout from "../components/layout"
import Title from "../components/title"

const TagsList = ({ data, location }) => {
  const tags = data.allMarkdownRemark.group

  return (
    <Layout location={location}>
      <Title to="/">All tags</Title>
      <div style={{marginBottom : `4rem`}}>
      {tags
        .sort((a, b) => {
          if (a.totalCount < b.totalCount) return 1
          else if (a.totalCount === b.totalCount)
            return a.fieldValue < b.fieldValue ? -1 : 1
          else return -1
        })
        .map(element => {
          return (
            <div>
              <Link to={`/tag/${element.fieldValue}`}>
                {element.fieldValue}
              </Link>{" "}
              {element.totalCount}
            </div>
          )
        })}
        </div>
    </Layout>
  )
}

export default TagsList

export const pageQuery = graphql`
  query TagsListQuery {
    allMarkdownRemark {
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
    }
  }
`
