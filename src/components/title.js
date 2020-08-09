import React from "react"
import { Link } from "gatsby"

import { rhythm, scale } from "../utils/typography"
import SEO from "../components/seo"

const Title = ({ children, to }) => {
    return (
        <div>
             <SEO title={children} />
        <h1
        style={{
          ...scale(1.5),
          marginBottom: rhythm(1.5),
          marginTop: 0,
        }}
      >
        <Link
          style={{
            boxShadow: `none`,
            color: `inherit`,
          }}
          to={to}
        >
          {children}
        </Link>
      </h1>
      </div>
    )
}


export default Title