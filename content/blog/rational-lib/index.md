---
title: "有理数类库"
date: "2014-03-22T11:15:30Z"
description: "参照 Complex 类库的代码，实现有理数类库。"
tags: 
  - "C/C++"
---

参照 Complex 类库的代码，实现有理数类库。

`makefile`

```makefile
a.out :  main.cpp rational.h
	g++ -o a.out main.cpp
```

`rational.h`
```cpp
#include<iostream>
#include<math.h>
#include<stdlib.h>
using namespace std;

int gcd( int, int );

class rational
{
    public:
        rational();
        rational( int );
        rational( int,int );
        rational( const rational& );

        friend ostream& operator<< ( ostream&, const rational& );
        friend istream& operator>> ( istream&, rational& );

        rational operator+ ( const rational& );
        rational operator- ( const rational& );
        rational operator* ( const rational& );
        rational operator/ ( const rational& );

        rational operator- ();
        rational& operator++ ();
        rational operator++ (int);
        rational& operator-- ();
        rational operator-- (int);

        rational& operator+= ( const rational& );
        rational& operator-= ( const rational& );
        rational& operator*= ( const rational& );
        rational& operator/= ( const rational& );

    private:
        void simple();
        int nume;
        int deno;  // 用分数来表示有理数
};
```


`main.cpp`
```cpp

#include"rational.h"


int gcd( int num_1, int num_2 )
{
    if( num_2 == 0 )
        return num_1;

    if( num_1 < num_2 )
         return gcd( num_2, num_1 );

    return gcd( num_2, num_1 % num_2 );
}


rational::rational() : nume(0), deno(1) {}
rational::rational(int num) : nume( num ), deno(1) {}
rational::rational(int num, int den) : nume(num), deno(den) { simple(); }
rational::rational( const rational& num ) : nume( num.nume ), deno( num.deno ) {}


void rational::simple()
{
    int div = gcd( abs( nume ),abs( deno ) );
    nume /= div;
    deno /= div;

    if( deno == 0 ) exit(1);
    if( deno < 0 ) {
         deno = -deno;
         nume = -nume;
    }
    if( nume == 0 )
        deno = 1;
}

ostream & operator<<( ostream& out, const rational& data )
{
    if( data.deno == 1 )
        out<< data.nume;
    else
        out<< data.nume << "/" << data.deno;
}
istream & operator>>( istream& in, rational& data )
{
    in>> data.nume >> data.deno;
}

rational rational::operator+ ( const rational& r2 )
{
    return rational( nume * r2.deno + deno * r2.nume, deno * r2.deno );
}
rational rational::operator- ( const rational& r2 )
{
    return rational( nume * r2.deno - deno * r2.nume, deno * r2.deno );
}
rational rational::operator* ( const rational& r2 )
{
    return rational( nume * r2.nume, deno * r2.deno );
}
rational rational::operator/ ( const rational& r2 )
{
    return rational( nume * r2.deno, deno * r2.nume );
}


rational rational::operator- ()
{
    return rational( -nume, deno );
}

rational& rational::operator++ ()
{
    nume += deno;
    simple();
    return *this;
}
rational rational::operator++ (int)
{
    rational temp( *this );
    ++( *this );
    return temp;
}
rational& rational::operator-- ()
{
    nume -= deno;
    simple();
    return *this;
}
rational rational::operator-- (int)
{
    rational temp( *this );
    --( *this );
    return temp;
}


rational& rational::operator+= ( const rational& r2 )
{
    *this = *this + r2;
    return *this;
}
rational& rational::operator-= ( const rational& r2 )
{
    *this = *this - r2;
    return *this;
}
rational& rational::operator*= ( const rational& r2 )
{
    *this = *this * r2;
    return *this;
}
rational& rational::operator/= ( const rational& r2 )
{
    *this = *this / r2;
    return *this;
}


int main()
{
    rational r1( 24, 11 );
    rational r2( 6, 14 );

    cout<< "r1 = " << r1 <<endl;
    cout<< "r2 = " << r2 <<endl;
    cout<<endl;

    cout<< "r1 + r2 = " << r1+r2 <<endl;
    cout<< "r1 - r2 = " << r1-r2 <<endl;
    cout<< "r1 * r2 = " << r1*r2 <<endl;
    cout<< "r1 / r2 = " << r1/r2 <<endl;
    cout<<endl;

    cout<< "-r1 = " << -r1 <<endl;
    cout<< "++r1 = " << ++r1 <<endl;
    cout<< "r1++ = " << r1++ <<endl;
    cout<< "--r2 = " << --r2 <<endl;
    cout<< "r2-- = " << r2-- <<endl;
    cout<<endl;

    cout<< "r2 + 6 = " << r2 + 6 <<endl;
    cout<< "r1 += r2 = " << (r1 += r2) <<endl;
    cout<< "r2 -= 7 = " << (r2 -= 7) <<endl;
    cout<< "r1 *= 3 = " << (r1 *= 3) <<endl;
    cout<< "r2 /= 2 = " << (r2 /= 2) <<endl;


    return 0;
}
```

