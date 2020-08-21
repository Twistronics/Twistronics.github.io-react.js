import React from "react"
import { Link } from "gatsby"
import { elastic as Menu } from "react-burger-menu"

import { rhythm, scale } from "../utils/typography"
import "./menu.sass"

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`
  let header

  if (location.pathname === rootPath) {
    header = (
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
          to={`/`}
        >
          {title}
        </Link>
      </h1>
    )
  } else {
    header = (
      <h3
        style={{
          fontFamily: `Montserrat, sans-serif`,
          marginTop: 0,
        }}
      >
        <Link
          style={{
            boxShadow: `none`,
            // color: `inherit`,
          }}
          to={`/`}
        >
          {title}
        </Link>
      </h3>
    )
  }
  return (
    <div>
      <div className="bm-menu-background-div">
      <Menu right>
        <a href="/" style={{display:`none`}}>Home</a>
        <a href="/">Home</a>

        <a href="/all-tags">
          All tags
        </a>
      </Menu>
    </div>
      <div
        style={{
          marginLeft: `auto`,
          marginRight: `auto`,
          maxWidth: rhythm(31),
          padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
        }}
      >
        <header>{header}</header>
        <main>{children}</main>
        <footer>
          © {new Date().getFullYear()}, Built with
          {` `}
          {/* Gatsby */}
          <a
            href="https://www.gatsbyjs.com"
            style={{ backgroundImage: `none` }}
          >
            Gatsby
          </a>
        </footer>
      </div>
    </div>
  )
}

export default Layout
